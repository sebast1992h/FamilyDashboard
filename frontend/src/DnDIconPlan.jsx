import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";


// props: icons, plan, family, days, onDrop, onRemove
export default function DnDIconPlan({ icons, plan, family, days, onDrop, onRemove }) {
  // plan: [day][person] = [iconIdx, ...]
  function handleDrop(result) {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    // Nur Drag von Icon-Liste in Zelle zulassen
    if (source.droppableId === "iconList" && destination.droppableId.startsWith("cell-")) {
      const [_, dayIdx, personIdx] = destination.droppableId.split("-");
      onDrop(parseInt(dayIdx), parseInt(personIdx), parseInt(draggableId));
    }
  }

  return (
    <DragDropContext onDragEnd={handleDrop}>
      <div className="flex gap-4 mb-4">
        {/* Icon-Liste */}
        <Droppable droppableId="iconList" direction="horizontal">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
              {icons.map((item, idx) => (
                <Draggable key={idx} draggableId={String(idx)} index={idx}>
                  {(prov) => (
                    <span
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      className="text-2xl cursor-move select-none border rounded bg-white dark:bg-gray-700 px-2"
                      title={item.name || "Icon ziehen"}
                    >
                      {item.icon}
                    </span>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr>
              <th className="border p-1"> </th>
              {days.map((day, i) => (
                <th key={i} className="border p-1">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {family.map((member, mIdx) => (
              <tr key={mIdx}>
                <td className="border p-1 font-semibold">{member}</td>
                {days.map((_, dIdx) => (
                  <td className="border p-1 min-w-[60px]" key={dIdx}>
                    <Droppable droppableId={`cell-${dIdx}-${mIdx}`} direction="horizontal">
                      {(prov) => (
                        <div ref={prov.innerRef} {...prov.droppableProps} className="flex flex-wrap gap-1 min-h-[32px]">
                          {plan[dIdx] && plan[dIdx][mIdx] && plan[dIdx][mIdx].map((iconIdx, i) => (
                            <span
                              key={i}
                              className="text-xl cursor-pointer border rounded bg-white dark:bg-gray-700 px-1"
                              title={icons[iconIdx]?.name || "Entfernen"}
                              onClick={() => onRemove(dIdx, mIdx, i)}
                            >
                              {icons[iconIdx]?.icon}
                            </span>
                          ))}
                          {prov.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DragDropContext>
  );
}
