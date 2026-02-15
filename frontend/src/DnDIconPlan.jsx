SYNTAXFEHLER_TEST_DNDICONPLAN
// DEBUG: Test-Log um sicherzustellen, dass dieses File wirklich geladen wird
// eslint-disable-next-line no-console
console.log('[DnDIconPlan] Datei geladen und ausgeführt');
import React from "react";
import { svgIcons } from "./ConfigPage.jsx";
import { getBackendImageUrl } from "./ConfigPage.jsx";
import { normalizeSvgForFont } from "./iconUtils_fixed";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";


// props: icons, plan, family, days, onDrop, onRemove
export default function DnDIconPlan({ icons, plan, family, days, onDrop, onRemove }) {
  // DEBUG: Log bei jedem Render
  // eslint-disable-next-line no-console
  console.log('[DnDIconPlan] Render mit icons:', icons);
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
                  {(prov) => {
                    let iconNode = null;
                    if (item.iconType === "emoji" || !item.iconType) {
                      iconNode = <span className="text-2xl">{item.icon}</span>;
                    } else if (item.iconType === "icon" && item.iconValue) {
                      // Debug: Log das gesamte Icon-Objekt IMMER
                      // eslint-disable-next-line no-console
                      console.log('[DnDIconPlan] Render iconType=icon:', item);
                      if (item.iconValue.trim().startsWith('<svg')) {
                        iconNode = <span className="text-2xl inline-block" dangerouslySetInnerHTML={{ __html: normalizeSvgForFont(item.iconValue) }} />;
                      } else {
                        const val = item.iconValue.trim().toLowerCase();
                        let svgIcon = svgIcons.find(s => s.name.trim().toLowerCase() === val);
                        if (!svgIcon) {
                          svgIcon = svgIcons.find(s => s.label.trim().toLowerCase() === val);
                        }
                        if (svgIcon) {
                          iconNode = <span className="text-2xl inline-block" dangerouslySetInnerHTML={{ __html: normalizeSvgForFont(svgIcon.svg) }} />;
                        } else {
                          // eslint-disable-next-line no-console
                          console.warn('[DnDIconPlan] Kein SVG gefunden für iconValue:', item.iconValue, 'Verglichen mit:', svgIcons.map(s => ({name: s.name, label: s.label})));
                          iconNode = <span className="text-2xl">🔲</span>;
                        }
                      }
                    } else if (item.iconType === "image" && item.iconValue) {
                      const imageUrl = getBackendImageUrl(item.iconValue);
                      iconNode = (
                        <img
                          src={imageUrl}
                          alt={item.activity}
                          className="w-12 h-12 object-contain rounded border border-slate-500 align-middle"
                          style={{ display: 'inline-block', verticalAlign: 'middle' }}
                        />
                      );
                    } else {
                      iconNode = <span className="text-2xl">❓</span>;
                    }
                    return (
                      <span
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className="text-2xl cursor-move select-none border rounded bg-white dark:bg-gray-700 px-2"
                        title={item.name || "Icon ziehen"}
                      >
                        {iconNode}
                      </span>
                    );
                  }}
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
                          {plan[dIdx] && plan[dIdx][mIdx] && plan[dIdx][mIdx].map((iconIdx, i) => {
                            const icon = icons[iconIdx];
                            let iconNode = null;
                            if (icon?.iconType === "emoji" || !icon?.iconType) {
                              iconNode = <span className="text-2xl">{icon?.icon}</span>;
                            } else if (icon?.iconType === "icon" && icon?.iconValue) {
                              // eslint-disable-next-line no-console
                              console.log('[DnDIconPlan] Render iconType=icon (table):', icon);
                              if (icon.iconValue.trim().startsWith('<svg')) {
                                iconNode = <span className="text-2xl inline-block" dangerouslySetInnerHTML={{ __html: normalizeSvgForFont(icon.iconValue) }} />;
                              } else {
                                const val = icon.iconValue.trim().toLowerCase();
                                let svgIcon = svgIcons.find(s => s.name.trim().toLowerCase() === val);
                                if (!svgIcon) {
                                  svgIcon = svgIcons.find(s => s.label.trim().toLowerCase() === val);
                                }
                                if (svgIcon) {
                                  iconNode = <span className="text-2xl inline-block" dangerouslySetInnerHTML={{ __html: normalizeSvgForFont(svgIcon.svg) }} />;
                                } else {
                                  // eslint-disable-next-line no-console
                                  console.warn('[DnDIconPlan] Kein SVG gefunden für iconValue:', icon.iconValue, 'Verglichen mit:', svgIcons.map(s => ({name: s.name, label: s.label})));
                                  iconNode = <span className="text-2xl">🔲</span>;
                                }
                              }
                            } else if (icon?.iconType === "image" && icon?.iconValue) {
                              const imageUrl = getBackendImageUrl(icon.iconValue);
                              iconNode = (
                                <img
                                  src={imageUrl}
                                  alt={icon.activity}
                                  className="w-12 h-12 object-contain rounded border border-slate-500 align-middle"
                                  style={{ display: 'inline-block', verticalAlign: 'middle' }}
                                />
                              );
                            } else {
                              iconNode = <span className="text-2xl">❓</span>;
                            }
                            return (
                              <span
                                key={i}
                                className="cursor-pointer border rounded bg-white dark:bg-gray-700 px-1"
                                title={icon?.name || "Entfernen"}
                                onClick={() => onRemove(dIdx, mIdx, i)}
                                style={{ fontSize: '2em', lineHeight: 1 }}
                              >
                                {iconNode}
                              </span>
                            );
                          })}
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
