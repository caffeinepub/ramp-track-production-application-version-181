import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useGetAllEquipment, useGetAllAssignments, useGetAllActivityLogs, useUpdateEquipment } from '../hooks/useQueries';
import { Loader2, AlertCircle, Settings, Search } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { getEquipmentCounts, getAllEquipment as getLocalEquipment, updateEquipment as updateLocalEquipment, type EquipmentRecord } from '../lib/equipmentRegistry';
import { loadAuditEvents, getEventsByEquipment, getEventsByUser, type ScanEvent } from '../lib/auditLog';
import { ensureUserContext } from '../lib/ensureUserContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface AdminDashboardProps {
  onBack: () => void;
  onManageEquipment: () => void;
}

// Helper to format equipment type for display
const formatEquipmentType = (type: string): string => {
  if (type === 'ELECTRIC_TUG') return 'ELECTRIC TUG';
  if (type === 'TUG') return 'TUG';
  return type.replace('_', ' ');
};

export default function AdminDashboard({ onBack, onManageEquipment }: AdminDashboardProps) {
  const { isRefreshing } = useAuth();
  const { data: equipment = [], isLoading: equipmentLoading, error: equipmentError } = useGetAllEquipment();
  const { data: assignments = [], isLoading: assignmentsLoading } = useGetAllAssignments();
  const { data: activityLogs = [], isLoading: logsLoading } = useGetAllActivityLogs();
  const updateEquipmentMutation = useUpdateEquipment();

  const [filterOperator, setFilterOperator] = useState<string>('all');
  const [filterEquipmentId, setFilterEquipmentId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Audit log state
  const [auditEvents, setAuditEvents] = useState<ScanEvent[]>([]);
  const [auditSearchEquipment, setAuditSearchEquipment] = useState('');
  const [auditSearchUser, setAuditSearchUser] = useState('');
  const [selectedAuditEquipment, setSelectedAuditEquipment] = useState<string | null>(null);
  const [selectedAuditUser, setSelectedAuditUser] = useState<string | null>(null);
  
  // Local equipment registry counts
  const [localCounts, setLocalCounts] = useState({ total: 0, available: 0, assigned: 0, maintenance: 0 });
  const [localEquipmentList, setLocalEquipmentList] = useState<EquipmentRecord[]>([]);

  useEffect(() => {
    // Update local equipment counts and list
    setLocalCounts(getEquipmentCounts());
    setLocalEquipmentList(getLocalEquipment());
    
    // Load audit events
    setAuditEvents(loadAuditEvents());
  }, []);

  // Refresh local counts and audit events periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalCounts(getEquipmentCounts());
      setLocalEquipmentList(getLocalEquipment());
      setAuditEvents(loadAuditEvents());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const totalEquipment = localCounts.total;
  const availableCount = localCounts.available;
  const assignedCount = localCounts.assigned;
  const maintenanceCount = localCounts.maintenance;

  const recentActivity = activityLogs
    .sort((a, b) => Number(b.timestamp - a.timestamp))
    .slice(0, 10);

  const isLoading = equipmentLoading || assignmentsLoading || logsLoading;

  // Get unique operators from local equipment
  const operators = Array.from(new Set(localEquipmentList.map(e => e.lastOperator).filter(Boolean))) as string[];

  // Filter equipment from local registry
  const filteredEquipment = localEquipmentList.filter(item => {
    if (filterOperator !== 'all' && item.lastOperator !== filterOperator) return false;
    if (filterEquipmentId && !item.id.toLowerCase().includes(filterEquipmentId.toLowerCase())) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus.toUpperCase()) return false;
    return true;
  });

  // Filter audit events
  const filteredAuditEvents = auditEvents.filter(event => {
    if (auditSearchEquipment && !event.equipmentId.toLowerCase().includes(auditSearchEquipment.toLowerCase())) {
      return false;
    }
    if (auditSearchUser) {
      const searchLower = auditSearchUser.toLowerCase();
      if (
        !event.user.badge.toLowerCase().includes(searchLower) &&
        !event.user.username.toLowerCase().includes(searchLower) &&
        !event.user.displayName.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    return true;
  }).slice(0, 25);

  // Handle tile click to filter by status
  const handleTileClick = async (status: string) => {
    // Validate session before allowing filter changes that might lead to updates
    const isValid = await ensureUserContext();
    if (!isValid) {
      return;
    }
    setFilterStatus(status);
  };

  // Handle equipment drill-down
  const handleEquipmentDrillDown = (equipmentId: string) => {
    setSelectedAuditEquipment(equipmentId);
  };

  // Handle user drill-down
  const handleUserDrillDown = (userBadge: string) => {
    setSelectedAuditUser(userBadge);
  };

  // Handle equipment status update with session validation
  const handleEquipmentStatusUpdate = async (equipmentId: string, newStatus: string) => {
    // Validate session before write operation
    const isValid = await ensureUserContext();
    if (!isValid) {
      toast.error('Session expired. Please log in again.');
      return;
    }

    setIsUpdating(true);
    try {
      // Update local registry
      const result = updateLocalEquipment(equipmentId, {
        status: newStatus as any,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update equipment');
      }

      // Refresh local state
      setLocalCounts(getEquipmentCounts());
      setLocalEquipmentList(getLocalEquipment());

      toast.success('Equipment updated successfully');
    } catch (error) {
      console.error('Failed to update equipment:', error);
      toast.error('Failed to update equipment');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: 'url(/assets/HomescreenBackground.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/40 to-black/30 backdrop-blur-[1px]" />
      
      <div className="relative z-10">
        <header className="bg-card/95 backdrop-blur-sm border-b shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Ramp Track Admin</h1>
                  <p className="text-sm text-muted-foreground">Equipment Management Dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isRefreshing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Reconnecting…</span>
                  </div>
                )}
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-foreground">Admin User</p>
                  <p className="text-xs text-muted-foreground">Administrator</p>
                </div>
                <Button variant="outline" onClick={onBack}>
                  <span className="mr-2">←</span>
                  Back to Sign On
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          {equipmentError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Backend unavailable / Unable to load equipment data. Please check your connection.
              </AlertDescription>
            </Alert>
          )}

          {isUpdating && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Updating equipment...
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card 
              className="border shadow-2xl cursor-pointer hover:scale-105 transition-transform"
              style={{
                background: 'rgba(15, 23, 42, 0.92)',
                borderColor: 'rgba(255,255,255,0.18)',
                borderRadius: '16px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
              }}
              onClick={() => handleTileClick('all')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium" style={{ color: '#cbd5f5' }}>Total Equipment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📦</span>
                  <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>{totalEquipment}</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border shadow-2xl cursor-pointer hover:scale-105 transition-transform"
              style={{
                background: 'rgba(15, 23, 42, 0.92)',
                borderColor: 'rgba(255,255,255,0.18)',
                borderRadius: '16px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
              }}
              onClick={() => handleTileClick('available')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium" style={{ color: '#cbd5f5' }}>Available</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-500" />
                  <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>{availableCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border shadow-2xl cursor-pointer hover:scale-105 transition-transform"
              style={{
                background: 'rgba(15, 23, 42, 0.92)',
                borderColor: 'rgba(255,255,255,0.18)',
                borderRadius: '16px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
              }}
              onClick={() => handleTileClick('assigned')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium" style={{ color: '#cbd5f5' }}>Assigned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-blue-500" />
                  <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>{assignedCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border shadow-2xl cursor-pointer hover:scale-105 transition-transform"
              style={{
                background: 'rgba(15, 23, 42, 0.92)',
                borderColor: 'rgba(255,255,255,0.18)',
                borderRadius: '16px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
              }}
              onClick={() => handleTileClick('maintenance')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium" style={{ color: '#cbd5f5' }}>Maintenance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>{maintenanceCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border shadow-2xl cursor-pointer hover:scale-105 transition-transform"
              style={{
                background: 'rgba(15, 23, 42, 0.92)',
                borderColor: 'rgba(255,255,255,0.18)',
                borderRadius: '16px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
              }}
              onClick={async () => {
                const isValid = await ensureUserContext();
                if (isValid) {
                  onManageEquipment();
                }
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium" style={{ color: '#cbd5f5' }}>Manage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Settings className="h-8 w-8" style={{ color: '#ffffff' }} />
                  <p className="text-lg font-bold" style={{ color: '#ffffff' }}>Equipment</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scan History Section */}
          <Card 
            className="border shadow-2xl"
            style={{
              background: 'rgba(15, 23, 42, 0.92)',
              borderColor: 'rgba(255,255,255,0.18)',
              borderRadius: '16px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            }}
          >
            <CardHeader>
              <CardTitle style={{ color: '#ffffff' }}>Scan History</CardTitle>
              <CardDescription style={{ color: '#cbd5f5' }}>Recent equipment check-in/check-out activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Search Equipment ID</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by equipment ID..."
                      value={auditSearchEquipment}
                      onChange={(e) => setAuditSearchEquipment(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Search User</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or badge..."
                      value={auditSearchUser}
                      onChange={(e) => setAuditSearchUser(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {filteredAuditEvents.length === 0 ? (
                <div className="text-center py-12" style={{ color: '#cbd5f5' }}>
                  <p className="text-lg font-medium mb-2">No scan history found</p>
                  <p className="text-sm">Scan events will appear here as equipment is checked in/out.</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Table>
                    <TableHeader>
                      <TableRow style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <TableHead style={{ color: '#cbd5f5' }}>Time</TableHead>
                        <TableHead style={{ color: '#cbd5f5' }}>User</TableHead>
                        <TableHead style={{ color: '#cbd5f5' }}>Action</TableHead>
                        <TableHead style={{ color: '#cbd5f5' }}>Equipment</TableHead>
                        <TableHead style={{ color: '#cbd5f5' }}>Location</TableHead>
                        <TableHead style={{ color: '#cbd5f5' }}>GPS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuditEvents.map((event) => (
                        <TableRow key={event.id} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <TableCell style={{ color: '#ffffff' }}>
                            {new Date(event.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell 
                            style={{ color: '#60a5fa', cursor: 'pointer' }}
                            onClick={() => handleUserDrillDown(event.user.badge)}
                            className="hover:underline"
                          >
                            {event.user.displayName}
                          </TableCell>
                          <TableCell>
                            <Badge variant={event.action === 'checkout' ? 'secondary' : 'default'}>
                              {event.action === 'checkout' ? 'Check-Out' : 'Check-In'}
                            </Badge>
                          </TableCell>
                          <TableCell 
                            style={{ color: '#60a5fa', cursor: 'pointer' }}
                            onClick={() => handleEquipmentDrillDown(event.equipmentId)}
                            className="hover:underline"
                          >
                            {event.equipmentId}
                          </TableCell>
                          <TableCell style={{ color: '#ffffff' }}>{event.locationLabel}</TableCell>
                          <TableCell style={{ color: '#cbd5f5', fontSize: '0.75rem' }}>
                            {event.lat.toFixed(6)}, {event.lng.toFixed(6)}
                            <br />
                            <span className="text-xs">±{event.accuracyMeters.toFixed(0)}m</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card 
            className="border shadow-2xl"
            style={{
              background: 'rgba(15, 23, 42, 0.92)',
              borderColor: 'rgba(255,255,255,0.18)',
              borderRadius: '16px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            }}
          >
            <CardHeader>
              <CardTitle style={{ color: '#ffffff' }}>Equipment Management</CardTitle>
              <CardDescription style={{ color: '#cbd5f5' }}>Filter and manage all equipment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Operator/Employee</Label>
                  <Select value={filterOperator} onValueChange={setFilterOperator}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Operators" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Operators</SelectItem>
                      {operators.map(op => (
                        <SelectItem key={op} value={op}>{op}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="equipment-id" style={{ color: '#cbd5f5' }}>Equipment ID</Label>
                  <Input
                    id="equipment-id"
                    placeholder="Search by ID..."
                    value={filterEquipmentId}
                    onChange={(e) => setFilterEquipmentId(e.target.value)}
                  />
                </div>

                <div>
                  <Label style={{ color: '#cbd5f5' }}>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredEquipment.length === 0 ? (
                <div className="text-center py-12" style={{ color: '#cbd5f5' }}>
                  <p className="text-lg font-medium mb-2">No equipment found</p>
                  <p className="text-sm">Try adjusting your filters or add equipment to the system.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEquipment.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-white/5 transition-colors"
                      style={{ 
                        background: 'rgba(30, 41, 59, 0.5)',
                        borderColor: 'rgba(255,255,255,0.1)',
                      }}
                      onClick={() => setSelectedEquipment(item)}
                    >
                      <div className="flex-1">
                        <p className="font-semibold" style={{ color: '#ffffff' }}>
                          {item.id}
                        </p>
                        <p className="text-sm" style={{ color: '#cbd5f5' }}>ID: {item.id}</p>
                        <p className="text-sm" style={{ color: '#cbd5f5' }}>Type: {formatEquipmentType(item.type)}</p>
                        {item.lastOperator && (
                          <p className="text-sm" style={{ color: '#cbd5f5' }}>Operator: {item.lastOperator}</p>
                        )}
                        {item.location && (
                          <p className="text-xs mt-1" style={{ color: '#cbd5f5' }}>
                            Location: {item.location}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant={
                          item.status === 'AVAILABLE' ? 'default' :
                          item.status === 'ASSIGNED' ? 'secondary' :
                          'destructive'
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card 
            className="border shadow-2xl"
            style={{
              background: 'rgba(15, 23, 42, 0.92)',
              borderColor: 'rgba(255,255,255,0.18)',
              borderRadius: '16px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            }}
          >
            <CardHeader>
              <CardTitle style={{ color: '#ffffff' }}>Recent Activity</CardTitle>
              <CardDescription style={{ color: '#cbd5f5' }}>Latest equipment operations</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto" style={{ color: '#ffffff' }} />
                  <p className="mt-4" style={{ color: '#cbd5f5' }}>Loading activity logs...</p>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-12" style={{ color: '#cbd5f5' }}>
                  <p className="text-lg font-medium mb-2">No activity yet</p>
                  <p className="text-sm">Activity will appear here as operations are performed.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((log) => (
                    <div 
                      key={log.id} 
                      className="p-3 rounded-lg border"
                      style={{ 
                        background: 'rgba(30, 41, 59, 0.5)',
                        borderColor: 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: '#ffffff' }}>{log.action.replace('_', ' ').toUpperCase()}</p>
                          <p className="text-sm mt-1" style={{ color: '#cbd5f5' }}>{log.details}</p>
                          <p className="text-xs mt-1" style={{ color: '#cbd5f5' }}>
                            User: {log.user_id}
                          </p>
                        </div>
                        <p className="text-xs" style={{ color: '#cbd5f5' }}>
                          {new Date(Number(log.timestamp) / 1000000).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        <footer className="py-6 text-center text-sm text-white/90 drop-shadow-lg">
          Built by Jayson James and Ramp Track Systems.
        </footer>
      </div>

      {/* Equipment Detail Dialog */}
      {selectedEquipment && (
        <Dialog open={!!selectedEquipment} onOpenChange={() => setSelectedEquipment(null)}>
          <DialogContent 
            className="max-w-2xl max-h-[80vh] overflow-y-auto"
            style={{
              background: 'rgba(15, 23, 42, 0.98)',
              borderColor: 'rgba(255,255,255,0.18)',
            }}
          >
            <DialogHeader>
              <DialogTitle style={{ color: '#ffffff' }}>Equipment Details</DialogTitle>
              <DialogDescription style={{ color: '#cbd5f5' }}>
                Detailed information for {selectedEquipment.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label style={{ color: '#cbd5f5' }}>Name</Label>
                <p className="text-lg font-semibold" style={{ color: '#ffffff' }}>{selectedEquipment.id}</p>
              </div>
              <div>
                <Label style={{ color: '#cbd5f5' }}>ID</Label>
                <p style={{ color: '#ffffff' }}>{selectedEquipment.id}</p>
              </div>
              <div>
                <Label style={{ color: '#cbd5f5' }}>Type</Label>
                <p style={{ color: '#ffffff' }}>{formatEquipmentType(selectedEquipment.type)}</p>
              </div>
              <div>
                <Label style={{ color: '#cbd5f5' }}>Status</Label>
                <div className="mt-1">
                  <Badge 
                    variant={
                      selectedEquipment.status === 'AVAILABLE' ? 'default' :
                      selectedEquipment.status === 'ASSIGNED' ? 'secondary' :
                      'destructive'
                    }
                  >
                    {selectedEquipment.status}
                  </Badge>
                </div>
              </div>
              {selectedEquipment.lastOperator && (
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Last Operator</Label>
                  <p style={{ color: '#ffffff' }}>{selectedEquipment.lastOperator}</p>
                </div>
              )}
              {selectedEquipment.checkoutTime && (
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Checkout Time</Label>
                  <p style={{ color: '#ffffff' }}>{new Date(selectedEquipment.checkoutTime).toLocaleString()}</p>
                </div>
              )}
              {selectedEquipment.returnTime && (
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Return Time</Label>
                  <p style={{ color: '#ffffff' }}>{new Date(selectedEquipment.returnTime).toLocaleString()}</p>
                </div>
              )}
              {selectedEquipment.location && (
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Location</Label>
                  <p style={{ color: '#ffffff' }}>{selectedEquipment.location}</p>
                </div>
              )}
              {selectedEquipment.maintenanceNotes && (
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Maintenance Notes</Label>
                  <p style={{ color: '#ffffff' }}>{selectedEquipment.maintenanceNotes}</p>
                </div>
              )}
              <div>
                <Label style={{ color: '#cbd5f5' }}>History</Label>
                {selectedEquipment.history && selectedEquipment.history.length > 0 ? (
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {selectedEquipment.history.slice().reverse().map((entry, idx) => (
                      <div 
                        key={idx}
                        className="p-2 rounded border"
                        style={{ 
                          background: 'rgba(30, 41, 59, 0.5)',
                          borderColor: 'rgba(255,255,255,0.1)',
                        }}
                      >
                        <p className="text-sm font-medium" style={{ color: '#ffffff' }}>
                          {entry.action}
                        </p>
                        {entry.operator && (
                          <p className="text-xs" style={{ color: '#cbd5f5' }}>
                            Operator: {entry.operator}
                          </p>
                        )}
                        {entry.location && (
                          <p className="text-xs" style={{ color: '#cbd5f5' }}>
                            Location: {entry.location}
                          </p>
                        )}
                        {entry.notes && (
                          <p className="text-xs" style={{ color: '#cbd5f5' }}>
                            Notes: {entry.notes}
                          </p>
                        )}
                        <p className="text-xs" style={{ color: '#cbd5f5' }}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm mt-2" style={{ color: '#cbd5f5' }}>No history available</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Equipment History Drill-Down Dialog */}
      {selectedAuditEquipment && (
        <Dialog open={!!selectedAuditEquipment} onOpenChange={() => setSelectedAuditEquipment(null)}>
          <DialogContent 
            className="max-w-3xl max-h-[80vh] overflow-y-auto"
            style={{
              background: 'rgba(15, 23, 42, 0.98)',
              borderColor: 'rgba(255,255,255,0.18)',
            }}
          >
            <DialogHeader>
              <DialogTitle style={{ color: '#ffffff' }}>Equipment History</DialogTitle>
              <DialogDescription style={{ color: '#cbd5f5' }}>
                All scan events for {selectedAuditEquipment}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <TableHead style={{ color: '#cbd5f5' }}>Time</TableHead>
                    <TableHead style={{ color: '#cbd5f5' }}>User</TableHead>
                    <TableHead style={{ color: '#cbd5f5' }}>Action</TableHead>
                    <TableHead style={{ color: '#cbd5f5' }}>Location</TableHead>
                    <TableHead style={{ color: '#cbd5f5' }}>GPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getEventsByEquipment(selectedAuditEquipment).map((event) => (
                    <TableRow key={event.id} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      <TableCell style={{ color: '#ffffff' }}>
                        {new Date(event.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell style={{ color: '#ffffff' }}>
                        {event.user.displayName}
                      </TableCell>
                      <TableCell>
                        <Badge variant={event.action === 'checkout' ? 'secondary' : 'default'}>
                          {event.action === 'checkout' ? 'Check-Out' : 'Check-In'}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ color: '#ffffff' }}>{event.locationLabel}</TableCell>
                      <TableCell style={{ color: '#cbd5f5', fontSize: '0.75rem' }}>
                        {event.lat.toFixed(6)}, {event.lng.toFixed(6)}
                        <br />
                        <span className="text-xs">±{event.accuracyMeters.toFixed(0)}m</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* User History Drill-Down Dialog */}
      {selectedAuditUser && (
        <Dialog open={!!selectedAuditUser} onOpenChange={() => setSelectedAuditUser(null)}>
          <DialogContent 
            className="max-w-3xl max-h-[80vh] overflow-y-auto"
            style={{
              background: 'rgba(15, 23, 42, 0.98)',
              borderColor: 'rgba(255,255,255,0.18)',
            }}
          >
            <DialogHeader>
              <DialogTitle style={{ color: '#ffffff' }}>User History</DialogTitle>
              <DialogDescription style={{ color: '#cbd5f5' }}>
                All scan events for user {selectedAuditUser}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <TableHead style={{ color: '#cbd5f5' }}>Time</TableHead>
                    <TableHead style={{ color: '#cbd5f5' }}>Action</TableHead>
                    <TableHead style={{ color: '#cbd5f5' }}>Equipment</TableHead>
                    <TableHead style={{ color: '#cbd5f5' }}>Location</TableHead>
                    <TableHead style={{ color: '#cbd5f5' }}>GPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getEventsByUser(selectedAuditUser).map((event) => (
                    <TableRow key={event.id} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      <TableCell style={{ color: '#ffffff' }}>
                        {new Date(event.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={event.action === 'checkout' ? 'secondary' : 'default'}>
                          {event.action === 'checkout' ? 'Check-Out' : 'Check-In'}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ color: '#ffffff' }}>
                        {event.equipmentId}
                      </TableCell>
                      <TableCell style={{ color: '#ffffff' }}>{event.locationLabel}</TableCell>
                      <TableCell style={{ color: '#cbd5f5', fontSize: '0.75rem' }}>
                        {event.lat.toFixed(6)}, {event.lng.toFixed(6)}
                        <br />
                        <span className="text-xs">±{event.accuracyMeters.toFixed(0)}m</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
