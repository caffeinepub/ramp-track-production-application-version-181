import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { CheckCircle2, AlertCircle, Search, Loader2 } from 'lucide-react';
import {
  getAllEquipment,
  addEquipment,
  updateEquipment,
  findById,
  type EquipmentRecord,
  type EquipmentType,
  type EquipmentStatus,
} from '../lib/equipmentRegistry';
import { ensureUserContext } from '../lib/ensureUserContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface ManageEquipmentScreenProps {
  onBack: () => void;
}

// Helper to format equipment type for display
const formatEquipmentType = (type: string): string => {
  if (type === 'ELECTRIC_TUG') return 'ELECTRIC TUG';
  if (type === 'TUG') return 'TUG';
  return type.replace('_', ' ');
};

export default function ManageEquipmentScreen({ onBack }: ManageEquipmentScreenProps) {
  const { isRefreshing } = useAuth();
  const [equipmentList, setEquipmentList] = useState<EquipmentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentRecord | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Add form state
  const [newEquipmentType, setNewEquipmentType] = useState<EquipmentType>('TUG');
  const [newEquipmentId, setNewEquipmentId] = useState('');
  const [newEquipmentLabel, setNewEquipmentLabel] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);
  
  // Edit form state
  const [editStatus, setEditStatus] = useState<EquipmentStatus>('AVAILABLE');
  const [editLabel, setEditLabel] = useState('');
  const [editError, setEditError] = useState('');

  console.log('[ManageEquipmentScreen] No component reads currentUser - using auth only');

  // Load equipment on mount and after changes
  const loadEquipment = () => {
    setEquipmentList(getAllEquipment());
  };

  useEffect(() => {
    loadEquipment();
  }, []);

  // Filter equipment by search query
  const filteredEquipment = equipmentList.filter(eq => 
    eq.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (eq.label && eq.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddEquipment = async () => {
    // Validate session before write operation
    const isValid = await ensureUserContext();
    if (!isValid) {
      toast.error('Session expired. Please log in again.');
      return;
    }

    setAddError('');
    setAddSuccess(false);
    setIsProcessing(true);

    try {
      if (!newEquipmentId.trim()) {
        setAddError('Equipment ID is required');
        return;
      }

      const result = addEquipment({
        id: newEquipmentId.trim(),
        type: newEquipmentType,
        label: newEquipmentLabel.trim() || undefined,
      });

      if (result.success) {
        setAddSuccess(true);
        setNewEquipmentId('');
        setNewEquipmentLabel('');
        setNewEquipmentType('TUG');
        loadEquipment();
        toast.success('Equipment added successfully');
        
        // Clear success message after 3 seconds
        setTimeout(() => setAddSuccess(false), 3000);
      } else {
        setAddError(result.error || 'Failed to add equipment');
        toast.error(result.error || 'Failed to add equipment');
      }
    } catch (error) {
      console.error('Failed to add equipment:', error);
      setAddError('Failed to add equipment');
      toast.error('Failed to add equipment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenEdit = (equipment: EquipmentRecord) => {
    setSelectedEquipment(equipment);
    setEditStatus(equipment.status);
    setEditLabel(equipment.label || '');
    setEditError('');
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedEquipment) return;

    // Validate session before write operation
    const isValid = await ensureUserContext();
    if (!isValid) {
      toast.error('Session expired. Please log in again.');
      setShowEditDialog(false);
      return;
    }

    setEditError('');
    setIsProcessing(true);

    try {
      const result = updateEquipment(selectedEquipment.id, {
        status: editStatus,
        label: editLabel.trim() || undefined,
      });

      if (result.success) {
        setShowEditDialog(false);
        setSelectedEquipment(null);
        loadEquipment();
        toast.success('Equipment updated successfully');
      } else {
        setEditError(result.error || 'Failed to update equipment');
        toast.error(result.error || 'Failed to update equipment');
      }
    } catch (error) {
      console.error('Failed to update equipment:', error);
      setEditError('Failed to update equipment');
      toast.error('Failed to update equipment');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadgeVariant = (status: EquipmentStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'default';
      case 'ASSIGNED':
        return 'secondary';
      case 'MAINTENANCE':
        return 'destructive';
      default:
        return 'default';
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
              <div>
                <h1 className="text-2xl font-bold text-foreground">Manage Equipment</h1>
                <p className="text-sm text-muted-foreground">Add and manage equipment registry</p>
              </div>
              <div className="flex items-center gap-4">
                {isRefreshing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Reconnecting…</span>
                  </div>
                )}
                <Button variant="outline" onClick={onBack}>
                  <span className="mr-2">←</span>
                  Back to Admin Menu
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          {isProcessing && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Processing...
              </AlertDescription>
            </Alert>
          )}

          {/* Add Equipment Form */}
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
              <CardTitle style={{ color: '#ffffff' }}>Add New Equipment</CardTitle>
              <CardDescription style={{ color: '#cbd5f5' }}>
                Register new equipment in the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Equipment Type *</Label>
                  <Select value={newEquipmentType} onValueChange={(value) => setNewEquipmentType(value as EquipmentType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TUG">TUG (Gas/Diesel)</SelectItem>
                      <SelectItem value="ELECTRIC_TUG">ELECTRIC TUG</SelectItem>
                      <SelectItem value="STANDUP_PUSHBACK">STANDUP PUSHBACK</SelectItem>
                      <SelectItem value="LAMBO_PUSHBACK">LAMBO PUSHBACK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="equipment-id" style={{ color: '#cbd5f5' }}>Equipment ID *</Label>
                  <Input
                    id="equipment-id"
                    value={newEquipmentId}
                    onChange={(e) => setNewEquipmentId(e.target.value)}
                    placeholder="e.g., TV1500 or TUG-001"
                    disabled={isProcessing}
                  />
                </div>

                <div>
                  <Label htmlFor="equipment-label" style={{ color: '#cbd5f5' }}>Label (Optional)</Label>
                  <Input
                    id="equipment-label"
                    value={newEquipmentLabel}
                    onChange={(e) => setNewEquipmentLabel(e.target.value)}
                    placeholder="e.g., Main Ramp Tug"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              {addError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{addError}</AlertDescription>
                </Alert>
              )}

              {addSuccess && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>Equipment added successfully!</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleAddEquipment} className="w-full md:w-auto" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Equipment'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Equipment List */}
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
              <CardTitle style={{ color: '#ffffff' }}>Equipment Registry</CardTitle>
              <CardDescription style={{ color: '#cbd5f5' }}>
                {equipmentList.length} equipment items registered
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID, type, or label..."
                  className="pl-10"
                />
              </div>

              {filteredEquipment.length === 0 ? (
                <div className="text-center py-12" style={{ color: '#cbd5f5' }}>
                  <p className="text-lg font-medium mb-2">
                    {searchQuery ? 'No equipment found' : 'No equipment registered'}
                  </p>
                  <p className="text-sm">
                    {searchQuery ? 'Try a different search term' : 'Add equipment using the form above'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {filteredEquipment.map((equipment) => (
                    <div 
                      key={equipment.id}
                      className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-white/5 transition-colors"
                      style={{ 
                        background: 'rgba(30, 41, 59, 0.5)',
                        borderColor: 'rgba(255,255,255,0.1)',
                      }}
                      onClick={() => handleOpenEdit(equipment)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold" style={{ color: '#ffffff' }}>
                            {equipment.id}
                          </p>
                          <Badge variant="outline" style={{ color: '#cbd5f5' }}>
                            {formatEquipmentType(equipment.type)}
                          </Badge>
                        </div>
                        <p className="text-sm mt-1" style={{ color: '#cbd5f5' }}>
                          ID: {equipment.id}
                        </p>
                        {equipment.label && (
                          <p className="text-sm" style={{ color: '#cbd5f5' }}>
                            {equipment.label}
                          </p>
                        )}
                        <p className="text-xs mt-1" style={{ color: '#cbd5f5' }}>
                          Added: {new Date(equipment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(equipment.status)}>
                        {equipment.status}
                      </Badge>
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

      {/* Edit Equipment Dialog */}
      {selectedEquipment && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent 
            className="max-w-md"
            style={{
              background: 'rgba(15, 23, 42, 0.98)',
              borderColor: 'rgba(255,255,255,0.18)',
            }}
          >
            <DialogHeader>
              <DialogTitle style={{ color: '#ffffff' }}>Edit Equipment</DialogTitle>
              <DialogDescription style={{ color: '#cbd5f5' }}>
                Update equipment details for {selectedEquipment.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label style={{ color: '#cbd5f5' }}>Equipment ID</Label>
                <p className="text-lg font-semibold mt-1" style={{ color: '#ffffff' }}>
                  {selectedEquipment.id}
                </p>
              </div>

              <div>
                <Label style={{ color: '#cbd5f5' }}>Type</Label>
                <p className="mt-1" style={{ color: '#ffffff' }}>
                  {formatEquipmentType(selectedEquipment.type)}
                </p>
              </div>

              <div>
                <Label htmlFor="edit-label" style={{ color: '#cbd5f5' }}>Label</Label>
                <Input
                  id="edit-label"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Optional label"
                  disabled={isProcessing}
                />
              </div>

              <div>
                <Label style={{ color: '#cbd5f5' }}>Status</Label>
                <Select value={editStatus} onValueChange={(value) => setEditStatus(value as EquipmentStatus)} disabled={isProcessing}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
                    <SelectItem value="ASSIGNED">ASSIGNED</SelectItem>
                    <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{editError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => setShowEditDialog(false)} 
                  variant="outline"
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
