'use client';

import { Column as ColumnType, Task } from '@/types';
import { Droppable } from '@hello-pangea/dnd';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const columnColors: Record<string, string> = {
  'backlog': 'bg-gray-100',
  'todo': 'bg-blue-50',
  'in-progress': 'bg-yellow-50',
  'review': 'bg-purple-50',
  'done': 'bg-green-50',
};

export function Column({ column, tasks, onAddTask, onEditTask, onDeleteTask }: ColumnProps) {
  return (
    <div className={`flex flex-col w-72 min-w-[288px] rounded-lg ${columnColors[column.id] || 'bg-gray-50'}`}>
      <div className="p-3 font-semibold text-gray-700 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span>{column.title}</span>
          <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          className="text-gray-400 hover:text-blue-600 hover:bg-white rounded p-1 transition-colors"
          title="Add task"
        >
          ➕
        </button>
      </div>
      
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              flex-1 p-2 min-h-[200px] transition-colors
              ${snapshot.isDraggingOver ? 'bg-blue-100/50' : ''}
            `}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
