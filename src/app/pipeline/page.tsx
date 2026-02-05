'use client';

import { useState } from 'react';
import { DragDropContext, DropResult, Droppable, Draggable } from '@hello-pangea/dnd';

// Simple prospect type
type Prospect = {
  id: string;
  title: string;
  company: string;
  stage: string;
};

// Sample data
const initialProspects: Prospect[] = [
  { id: '1', title: 'Henderson Plumbing Website', company: 'Henderson Plumbing', stage: 'closed_won' },
  { id: '2', title: 'Kicking Tree Lawn Care', company: 'Kicking Tree LLC', stage: 'closed_won' },
  { id: '3', title: 'New Heights Tree Service', company: 'New Heights Tree Service', stage: 'negotiating' },
  { id: '4', title: 'Blue Ridge Painting', company: 'Blue Ridge Painting Co', stage: 'follow_up' },
];

const stages = [
  { id: 'lead', title: 'Lead' },
  { id: 'site_built', title: 'Site Built' },
  { id: 'outreach', title: 'Outreach' },
  { id: 'contacted', title: 'Contacted' },
  { id: 'follow_up', title: 'Follow Up' },
  { id: 'negotiating', title: 'Negotiating' },
  { id: 'closed_won', title: 'Closed Won' },
  { id: 'closed_lost', title: 'Closed Lost' }
];

export default function PipelinePage() {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    
    setProspects(prev => prev.map(prospect => 
      prospect.id === draggableId 
        ? { ...prospect, stage: destination.droppableId }
        : prospect
    ));
  };

  const getProspectsForStage = (stageId: string) => {
    return prospects.filter(p => p.stage === stageId);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Sales Pipeline</h1>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto' }}>
          {stages.map(stage => {
            const stageProspects = getProspectsForStage(stage.id);
            
            return (
              <div key={stage.id} style={{ minWidth: '250px', backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
                <h3>{stage.title} ({stageProspects.length})</h3>
                
                <Droppable droppableId={stage.id}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} style={{ minHeight: '100px' }}>
                      {stageProspects.map((prospect, index) => (
                        <Draggable key={prospect.id} draggableId={prospect.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                backgroundColor: 'white',
                                padding: '10px',
                                margin: '5px 0',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                cursor: 'pointer',
                                ...provided.draggableProps.style
                              }}
                            >
                              <h4 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>{prospect.title}</h4>
                              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{prospect.company}</p>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}