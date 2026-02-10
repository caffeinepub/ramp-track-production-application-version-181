import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { findById, type EquipmentRecord } from '../lib/equipmentRegistry';
import { getHistoryForEquipment, type EquipmentEvent } from '../lib/equipmentHistory';

interface EquipmentDetailScreenProps {
  equipmentId: string;
  onBack: () => void;
}

// Helper to format equipment type for display
const formatEquipmentType = (type: string): string => {
  if (type === 'ELECTRIC_TUG') return 'ELECTRIC TUG';
  if (type === 'TUG') return 'TUG';
  return type.replace('_', ' ');
};

// Helper to format event type for display
const formatEventType = (eventType: string): string => {
  return eventType.replace('_', ' ');
};

export default function EquipmentDetailScreen({ equipmentId, onBack }: EquipmentDetailScreenProps) {
  const equipment = findById(equipmentId);
  const history = getHistoryForEquipment(equipmentId);

  if (!equipment) {
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
                <h1 className="text-2xl font-bold text-foreground">Equipment Not Found</h1>
                <Button variant="outline" onClick={onBack}>
                  <span className="mr-2">←</span>
                  Back
                </Button>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-6">
            <Card 
              className="border shadow-2xl"
              style={{
                background: 'rgba(15, 23, 42, 0.92)',
                borderColor: 'rgba(255,255,255,0.18)',
                borderRadius: '16px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
              }}
            >
              <CardContent className="py-12 text-center">
                <p className="text-lg" style={{ color: '#cbd5f5' }}>
                  Equipment with ID "{equipmentId}" not found.
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
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
                <h1 className="text-2xl font-bold text-foreground">Equipment Details</h1>
                <p className="text-sm text-muted-foreground">{equipment.id}</p>
              </div>
              <Button variant="outline" onClick={onBack}>
                <span className="mr-2">←</span>
                Back
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Equipment Header */}
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
              <div className="flex items-center justify-between">
                <CardTitle style={{ color: '#ffffff' }}>{equipment.id}</CardTitle>
                <Badge variant={getStatusBadgeVariant(equipment.status)}>
                  {equipment.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label style={{ color: '#cbd5f5' }}>Equipment ID</Label>
                <p className="text-lg font-semibold mt-1" style={{ color: '#ffffff' }}>
                  {equipment.id}
                </p>
              </div>

              <div>
                <Label style={{ color: '#cbd5f5' }}>Type</Label>
                <p className="mt-1" style={{ color: '#ffffff' }}>
                  {formatEquipmentType(equipment.type)}
                </p>
              </div>

              {equipment.label && (
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Label</Label>
                  <p className="mt-1" style={{ color: '#ffffff' }}>
                    {equipment.label}
                  </p>
                </div>
              )}

              {equipment.lastOperator && (
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Last Operator</Label>
                  <p className="mt-1" style={{ color: '#ffffff' }}>
                    {equipment.lastOperator}
                  </p>
                </div>
              )}

              {equipment.checkoutTime && (
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Last Checkout</Label>
                  <p className="mt-1" style={{ color: '#ffffff' }}>
                    {new Date(equipment.checkoutTime).toLocaleString()}
                  </p>
                </div>
              )}

              {equipment.returnTime && (
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Last Return</Label>
                  <p className="mt-1" style={{ color: '#ffffff' }}>
                    {new Date(equipment.returnTime).toLocaleString()}
                  </p>
                </div>
              )}

              {equipment.location && (
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Location</Label>
                  <p className="mt-1" style={{ color: '#ffffff' }}>
                    {equipment.location}
                  </p>
                </div>
              )}

              {equipment.maintenanceNotes && (
                <div>
                  <Label style={{ color: '#cbd5f5' }}>Maintenance Notes</Label>
                  <p className="mt-1" style={{ color: '#ffffff' }}>
                    {equipment.maintenanceNotes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event History */}
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
              <CardTitle style={{ color: '#ffffff' }}>Event History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-12" style={{ color: '#cbd5f5' }}>
                  <p className="text-lg font-medium mb-2">No events recorded</p>
                  <p className="text-sm">Events will appear here as operations are performed.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {history.map((event) => (
                    <div 
                      key={event.id}
                      className="p-4 rounded-lg border"
                      style={{ 
                        background: 'rgba(30, 41, 59, 0.5)',
                        borderColor: 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge 
                          variant={
                            event.eventType === 'CHECK_OUT' ? 'secondary' :
                            event.eventType === 'CHECK_IN' ? 'default' :
                            'destructive'
                          }
                        >
                          {formatEventType(event.eventType)}
                        </Badge>
                        <p className="text-xs" style={{ color: '#cbd5f5' }}>
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm" style={{ color: '#cbd5f5' }}>
                          <span className="font-medium">Operator:</span> {event.operator}
                        </p>
                        
                        {event.location && (
                          <p className="text-sm" style={{ color: '#cbd5f5' }}>
                            <span className="font-medium">Location:</span> {event.location}
                          </p>
                        )}
                        
                        {event.notes && (
                          <p className="text-sm" style={{ color: '#cbd5f5' }}>
                            <span className="font-medium">Notes:</span> {event.notes}
                          </p>
                        )}
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
    </div>
  );
}
