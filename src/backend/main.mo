import AccessControl "authorization/access-control";
import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Iter "mo:core/Iter";
import Text "mo:core/Text";

actor {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();

  // Initialize auth (first caller becomes admin, others become users)
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    // Admin-only check happens inside
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public type UserProfile = {
    employee_id : Text;
    display_name : Text;
    role : Text;
    login_time : Int;
  };

  var userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Storage for photos and documents
  let storage = Storage.new();
  include MixinStorage(storage);

  // Data models
  public type Equipment = {
    id : Text;
    name : Text;
    status : Text; // "available", "assigned", "maintenance"
    assigned_operator : ?Text;
    last_location : Text;
    last_update_time : Int;
  };

  public type Assignment = {
    id : Text;
    equipment_id : Text;
    operator_id : Text;
    action : Text; // "check_out", "check_in"
    timestamp : Int;
    location : Text;
  };

  public type Issue = {
    id : Text;
    equipment_id : Text;
    category : Text;
    location : Text;
    photo : ?Storage.ExternalBlob;
    grounded : Bool;
    notes : Text;
    operator_id : Text;
    timestamp : Int;
    status : Text; // "open", "resolved"
  };

  public type Session = {
    id : Text;
    employee_id : Text;
    display_name : Text;
    role : Text;
    login_time : Int;
  };

  public type ActivityLog = {
    id : Text;
    action : Text;
    user_id : Text;
    timestamp : Int;
    details : Text;
  };

  var equipment = Map.empty<Text, Equipment>();
  var assignments = Map.empty<Text, Assignment>();
  var issues = Map.empty<Text, Issue>();
  var sessions = Map.empty<Text, Session>();
  var activityLogs = Map.empty<Text, ActivityLog>();

  // Equipment operations
  public shared ({ caller }) func addEquipment(equipmentData : Equipment) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add equipment");
    };
    equipment.add(equipmentData.id, equipmentData);
  };

  public shared ({ caller }) func updateEquipment(equipmentData : Equipment) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update equipment");
    };

    // Get existing equipment to determine operation type
    let existingEquipment = equipment.get(equipmentData.id);
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let callerProfile = userProfiles.get(caller);

    // Admins can make any changes
    if (isAdmin) {
      equipment.add(equipmentData.id, equipmentData);
      return;
    };

    // Non-admin users can only perform check-out and check-in operations
    switch (callerProfile) {
      case (?profile) {
        switch (existingEquipment) {
          case (?existing) {
            // Validate that only allowed fields are being changed
            // Non-admins can only change: status (available<->assigned), assigned_operator, last_location, last_update_time
            if (equipmentData.id != existing.id or equipmentData.name != existing.name) {
              Runtime.trap("Unauthorized: Cannot modify equipment ID or name");
            };

            // Check-in operation: equipment must be assigned to caller
            if (equipmentData.status == "available" and existing.status == "assigned") {
              switch (existing.assigned_operator) {
                case (?assignedOp) {
                  if (assignedOp != profile.employee_id) {
                    Runtime.trap("Unauthorized: Can only check in equipment assigned to you");
                  };
                  // Verify assigned_operator is being cleared
                  switch (equipmentData.assigned_operator) {
                    case (?_) {
                      Runtime.trap("Unauthorized: Must clear assigned_operator on check-in");
                    };
                    case null {};
                  };
                };
                case null {
                  Runtime.trap("Unauthorized: Equipment assignment data is invalid");
                };
              };
            }
            // Check-out operation: equipment must be available
            else if (equipmentData.status == "assigned" and existing.status == "available") {
              // Verify the operator being assigned is the caller
              switch (equipmentData.assigned_operator) {
                case (?newOp) {
                  if (newOp != profile.employee_id) {
                    Runtime.trap("Unauthorized: Can only check out equipment to yourself");
                  };
                };
                case null {
                  Runtime.trap("Unauthorized: Must specify operator for check-out");
                };
              };
            }
            // Status change to maintenance requires admin
            else if (equipmentData.status == "maintenance") {
              Runtime.trap("Unauthorized: Only admins can change equipment to maintenance status");
            }
            // Prevent any other status changes
            else if (equipmentData.status != existing.status) {
              Runtime.trap("Unauthorized: Invalid status transition");
            }
            // If status unchanged, prevent reassignment
            else if (existing.status == "assigned") {
              switch (existing.assigned_operator, equipmentData.assigned_operator) {
                case (?existingOp, ?newOp) {
                  if (existingOp != newOp) {
                    Runtime.trap("Unauthorized: Cannot reassign equipment without check-in first");
                  };
                };
                case (_, _) {
                  Runtime.trap("Unauthorized: Invalid assignment state");
                };
              };
            };
          };
          case null {
            Runtime.trap("Unauthorized: Equipment does not exist");
          };
        };
      };
      case null {
        Runtime.trap("Unauthorized: Profile not found");
      };
    };

    equipment.add(equipmentData.id, equipmentData);
  };

  public query ({ caller }) func getEquipment(id : Text) : async ?Equipment {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view equipment");
    };
    
    let equipmentData = equipment.get(id);
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    
    // Admins can view all equipment
    if (isAdmin) {
      return equipmentData;
    };
    
    // Non-admin users can only view equipment they have assigned or available equipment
    let callerProfile = userProfiles.get(caller);
    switch (equipmentData, callerProfile) {
      case (?eq, ?profile) {
        // Allow viewing if equipment is available or assigned to caller
        if (eq.status == "available") {
          return equipmentData;
        };
        switch (eq.assigned_operator) {
          case (?assignedOp) {
            if (assignedOp != profile.employee_id) {
              Runtime.trap("Unauthorized: Can only view equipment assigned to you");
            };
          };
          case null {
            // Equipment not assigned - should not happen if status is "assigned"
            Runtime.trap("Unauthorized: Invalid equipment state");
          };
        };
      };
      case (?eq, null) {
        Runtime.trap("Unauthorized: Profile not found");
      };
      case (null, _) {};
    };
    
    equipmentData;
  };

  public query ({ caller }) func getAllEquipment() : async [Equipment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view equipment");
    };
    
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    
    // Admins can see all equipment
    if (isAdmin) {
      return equipment.values().toArray();
    };
    
    // Non-admin users can only see available equipment and equipment assigned to them
    let callerProfile = userProfiles.get(caller);
    switch (callerProfile) {
      case (?profile) {
        equipment.values().filter(func(eq : Equipment) : Bool {
          eq.status == "available" or 
          (switch (eq.assigned_operator) {
            case (?op) { op == profile.employee_id };
            case null { false };
          })
        }).toArray();
      };
      case null {
        Runtime.trap("Unauthorized: Profile not found");
      };
    };
  };

  // Assignment operations
  public shared ({ caller }) func createAssignment(assignmentData : Assignment) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create assignments");
    };

    // Verify ownership: user can only create assignments for themselves
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let callerProfile = userProfiles.get(caller);

    if (not isAdmin) {
      switch (callerProfile) {
        case (?profile) {
          if (assignmentData.operator_id != profile.employee_id) {
            Runtime.trap("Unauthorized: Can only create assignments for yourself");
          };
        };
        case null {
          Runtime.trap("Unauthorized: Profile not found");
        };
      };
    };

    assignments.add(assignmentData.id, assignmentData);
  };

  public query ({ caller }) func getAssignmentsByOperator(operatorId : Text) : async [Assignment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view assignments");
    };

    // Get caller's profile to verify ownership
    let callerProfile = userProfiles.get(caller);
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);

    if (not isAdmin) {
      switch (callerProfile) {
        case (?profile) {
          if (profile.employee_id != operatorId) {
            Runtime.trap("Unauthorized: Can only view your own assignments");
          };
        };
        case null {
          Runtime.trap("Unauthorized: Profile not found");
        };
      };
    };

    assignments.values().filter(func(a) { a.operator_id == operatorId }).toArray();
  };

  public query ({ caller }) func getAllAssignments() : async [Assignment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all assignments");
    };
    assignments.values().toArray();
  };

  // Issue operations
  public shared ({ caller }) func reportIssue(issueData : Issue) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can report issues");
    };

    // Verify ownership: user can only report issues for themselves
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let callerProfile = userProfiles.get(caller);

    if (not isAdmin) {
      switch (callerProfile) {
        case (?profile) {
          if (issueData.operator_id != profile.employee_id) {
            Runtime.trap("Unauthorized: Can only report issues for yourself");
          };
        };
        case null {
          Runtime.trap("Unauthorized: Profile not found");
        };
      };
    };

    issues.add(issueData.id, issueData);
  };

  public shared ({ caller }) func updateIssue(issueData : Issue) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update issues");
    };
    issues.add(issueData.id, issueData);
  };

  public query ({ caller }) func getOpenIssues() : async [Issue] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view issues");
    };
    
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let allOpenIssues = issues.values().filter(func(i) { i.status == "open" }).toArray();
    
    // Non-admin users can only see their own issues
    if (not isAdmin) {
      let callerProfile = userProfiles.get(caller);
      switch (callerProfile) {
        case (?profile) {
          return allOpenIssues.filter(func(i : Issue) : Bool {
            i.operator_id == profile.employee_id
          });
        };
        case null {
          Runtime.trap("Unauthorized: Profile not found");
        };
      };
    };
    
    allOpenIssues;
  };

  public query ({ caller }) func getAllIssues() : async [Issue] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all issues");
    };
    issues.values().toArray();
  };

  // Session operations
  public shared ({ caller }) func createSession(sessionData : Session) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create sessions");
    };

    // Verify ownership: user can only create sessions for themselves
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let callerProfile = userProfiles.get(caller);

    if (not isAdmin) {
      switch (callerProfile) {
        case (?profile) {
          if (sessionData.employee_id != profile.employee_id) {
            Runtime.trap("Unauthorized: Can only create sessions for yourself");
          };
        };
        case null {
          Runtime.trap("Unauthorized: Profile not found");
        };
      };
    };

    sessions.add(sessionData.id, sessionData);
  };

  public query ({ caller }) func getSession(id : Text) : async ?Session {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sessions");
    };

    let session = sessions.get(id);
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let callerProfile = userProfiles.get(caller);

    if (not isAdmin) {
      switch (session, callerProfile) {
        case (?s, ?profile) {
          if (s.employee_id != profile.employee_id) {
            Runtime.trap("Unauthorized: Can only view your own session");
          };
        };
        case (?s, null) {
          Runtime.trap("Unauthorized: Profile not found");
        };
        case (null, _) {};
      };
    };

    session;
  };

  public query ({ caller }) func getAllSessions() : async [Session] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all sessions");
    };
    sessions.values().toArray();
  };

  // Activity log operations
  public shared ({ caller }) func logActivity(activityData : ActivityLog) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can log activity");
    };

    // Verify ownership: user can only log activity for themselves
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let callerProfile = userProfiles.get(caller);

    if (not isAdmin) {
      switch (callerProfile) {
        case (?profile) {
          if (activityData.user_id != profile.employee_id) {
            Runtime.trap("Unauthorized: Can only log activity for yourself");
          };
        };
        case null {
          Runtime.trap("Unauthorized: Profile not found");
        };
      };
    };

    activityLogs.add(activityData.id, activityData);
  };

  public query ({ caller }) func getActivityLogsByUser(userId : Text) : async [ActivityLog] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view activity logs");
    };

    // Get caller's profile to verify ownership
    let callerProfile = userProfiles.get(caller);
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);

    if (not isAdmin) {
      switch (callerProfile) {
        case (?profile) {
          if (profile.employee_id != userId) {
            Runtime.trap("Unauthorized: Can only view your own activity logs");
          };
        };
        case null {
          Runtime.trap("Unauthorized: Profile not found");
        };
      };
    };

    activityLogs.values().filter(func(a) { a.user_id == userId }).toArray();
  };

  public query ({ caller }) func getAllActivityLogs() : async [ActivityLog] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all activity logs");
    };
    activityLogs.values().toArray();
  };

  // Helper function to get current timestamp - requires authentication
  public query ({ caller }) func getCurrentTime() : async Int {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access time");
    };
    Time.now();
  };

  // Demo operator credentials - requires authentication
  // This should only be accessible after initial authentication setup
  public query ({ caller }) func getDemoOperatorCredentials() : async {
    email : Text;
    password : Text;
    role : Text;
    employee_id : Text;
    display_name : Text;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access demo credentials");
    };
    {
      email = "operator@demo.com";
      password = "demo123";
      role = "Operator";
      employee_id = "DEMO001";
      display_name = "Demo Operator";
    };
  };

  // Employee ID validation and role assignment - ADMIN ONLY
  // This function should only be accessible to admins to prevent reconnaissance
  public query ({ caller }) func validateEmployeeId(employeeId : Text) : async {
    isValid : Bool;
    role : Text;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can validate employee IDs");
    };
    
    // This function provides role information for employee ID validation
    // It should only be used by admins for user management purposes
    if (employeeId == "970251" or employeeId == "97025101") {
      { isValid = true; role = "admin" };
    } else if (employeeId == "970231" or employeeId == "970232") {
      { isValid = true; role = "agent" };
    } else if (employeeId.size() == 6 or employeeId.size() == 8) {
      { isValid = true; role = "operator" };
    } else {
      { isValid = false; role = "unknown" };
    };
  };
};
