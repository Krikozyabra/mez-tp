import { useMemo } from "react";
import styles from "./GanttChart.module.css";

// ... (normalizeDate, getDaysDiff, formatDateRu, CELL_WIDTH без изменений) ...
const normalizeDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};
const getDaysDiff = (start, end) => (end - start) / (1000 * 60 * 60 * 24);
const formatDateRu = (date) =>
  date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
const CELL_WIDTH = 40;

const GanttChart = ({
  operations = [],
  activeOperationId,
  orderTitle,
  timelineStartDate,
  orderDeadline,
  compact = false,
  onSelectOperation,
  onEditOperation,
  canEdit = false,
  daysRange = 60,

  // Новые пропсы
  currentUser,
  onInitiateStart,
  onInitiateFinish,
}) => {
  // ... (useMemo для дат и функций расчета позиций - БЕЗ ИЗМЕНЕНИЙ) ...
  const chartStartDate = useMemo(
    () => normalizeDate(timelineStartDate || new Date()),
    [timelineStartDate]
  );
  const today = normalizeDate(new Date());
  const deadlineDate = normalizeDate(orderDeadline);
  const dates = useMemo(
    () =>
      Array.from({ length: daysRange }, (_, i) => {
        const d = new Date(chartStartDate);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [chartStartDate, daysRange]
  );

  const getBarPosition = (startStr, endStr) => {
    /* ... код тот же ... */
    if (!startStr || !endStr) return null;
    const start = normalizeDate(startStr);
    const end = normalizeDate(endStr);
    if (isNaN(start) || isNaN(end)) return null;
    const offsetDays = getDaysDiff(chartStartDate, start);
    let durationDays = getDaysDiff(start, end);
    if (durationDays < 1) durationDays = 1;
    if (offsetDays + durationDays < 0 || offsetDays > daysRange) return null;
    const visibleLeft = Math.max(0, offsetDays);
    const visibleRight = Math.min(daysRange, offsetDays + durationDays);
    const visibleWidth = visibleRight - visibleLeft;
    if (visibleWidth <= 0) return null;
    return { left: visibleLeft * CELL_WIDTH, width: visibleWidth * CELL_WIDTH };
  };
  const getLinePosition = (dateTarget, align = 'start') => {
    if (!dateTarget) return null;
    const offset = getDaysDiff(chartStartDate, dateTarget);
    
    // Разрешаем отрисовку на границе справа, если align='end'
    if (offset < 0 || offset > daysRange) return null;
    
    let pixelOffset = offset * CELL_WIDTH;

    if (align === 'center') {
        pixelOffset += CELL_WIDTH / 2; // Сдвиг на середину клетки
    } else if (align === 'end') {
        pixelOffset += CELL_WIDTH;     // Сдвиг в конец клетки (на границу со следующим днем)
    }

    return pixelOffset;
  };

  const todayPos = getLinePosition(today, 'center');        // Середина
  const deadlinePos = getLinePosition(deadlineDate, 'end'); // Конец
  const totalWidth = daysRange * CELL_WIDTH;

  // --- ХЕЛПЕР ПРОВЕРКИ ПРАВ ---
  const canUserAct = (op) => {
      if (op.completed) return false;
      const role = currentUser?.role;
      if (!role) return false;

      const isTechnologOrAdmin = role === 'technolog' || role === 'admin';
      
      // Используем нестрогое сравнение (==) для ID, чтобы '5' было равно 5
      const isAssignedMaster = role === 'master' && (op.masterId != null) && (currentUser?.id == op.masterId);
      
      const isMasterNotAssigned = !op.masterId;

      if (isMasterNotAssigned) return isTechnologOrAdmin;
      return isTechnologOrAdmin || isAssignedMaster;
  };

  return (
    <div className={`${styles.wrapper} ${compact ? styles.compact : ""}`}>
      {!compact && (
        <div className={styles.header}>
          <span className={styles.title}>Диаграмма Ганта • {orderTitle}</span>
        </div>
      )}

      <div className={styles.chartContainer}>
        {/* ЛЕВАЯ КОЛОНКА */}
        <div className={styles.leftPanel}>
          <div className={styles.leftPanelHeader}>Операция</div>
          <div className={styles.leftPanelBody}>
            {operations.map((op) => {
              const hasRights = canUserAct(op);
              const isPlanned = !op.inProgress && !op.completed;
              const isInProgress = op.inProgress && !op.completed;

              return (
                <div
                  key={op.id}
                  className={`${styles.opNameRow} ${
                    op.id === activeOperationId ? styles.rowActive : ""
                  }`}
                  onClick={() => onSelectOperation?.(op)}
                >
                  {/* Название */}
                  <div className={styles.opNameText} title={op.name}>
                    {op.name}
                  </div>

                  {/* КНОПКИ УПРАВЛЕНИЯ */}
                  <div className={styles.rowActions}>
                    {/* 1. Кнопка редактирования (Технолог) */}
                    {canEdit && onEditOperation && (
                      <button
                        className={styles.miniEditBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditOperation(op);
                        }}
                        title="Редактировать"
                      >
                        ✎
                      </button>
                    )}

                    {/* 2. Кнопка запуска (Play) */}
                    {hasRights && isPlanned && (
                      <button
                        className={`${styles.actionBtn} ${styles.startBtn}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInitiateStart(op);
                        }}
                        title="Начать работу"
                      >
                        ▶
                      </button>
                    )}

                    {/* 3. Кнопка завершения (Stop) */}
                    {hasRights && isInProgress && (
                      <button
                        className={`${styles.actionBtn} ${styles.finishBtn}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInitiateFinish(op);
                        }}
                        title="Завершить операцию"
                      >
                        ■
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ПРАВАЯ ЧАСТЬ (Скролл) */}
        <div className={styles.scrollArea}>
          <div className={styles.timelineContent} style={{ width: totalWidth }}>
            <div className={styles.timelineHeader}>
              {dates.map((d, i) => (
                <div
                  key={i}
                  className={styles.dateCell}
                  style={{ width: CELL_WIDTH }}
                >
                  {formatDateRu(d)}
                </div>
              ))}
            </div>
            <div className={styles.timelineBody}>
              <div className={styles.gridLayer}>
                {dates.map((_, i) => (
                  <div
                    key={i}
                    className={styles.gridLine}
                    style={{ left: i * CELL_WIDTH, width: CELL_WIDTH }}
                  />
                ))}
                {todayPos !== null && (
                  <div
                    className={styles.todayLine}
                    style={{ left: todayPos }}
                    title={`Сегодня`}
                  />
                )}
                {deadlinePos !== null && (
                  <div
                    className={styles.deadlineLine}
                    style={{ left: deadlinePos }}
                    title={`Дедлайн`}
                  />
                )}
              </div>
              <div className={styles.barsLayer}>
                    {operations.map(op => {
                        const planPos = getBarPosition(op.originalPlannedStart, op.originalPlannedEnd);
                        
                        // Прогноз: если нет явного прогноза, используем план или start/end
                        const predictPos = getBarPosition(
                            op.predictStart || op.startDate, 
                            op.predictEnd || op.endDate
                        );
                        
                        // === ИСПРАВЛЕНИЕ: Логика фактической линии ===
                        // Если есть actualEnd -> рисуем от start до end
                        // Если нет actualEnd, но есть actualStart -> рисуем от start до СЕГОДНЯ
                        let actualEndToUse = op.actualEnd;
                        if (op.actualStart && !op.actualEnd) {
                            actualEndToUse = new Date().toISOString(); // "Сегодня"
                        }
                        const actualPos = getBarPosition(op.actualStart, actualEndToUse);
                        // ============================================

                        return (
                            <div 
                                key={op.id} 
                                className={`${styles.barsRow} ${op.id === activeOperationId ? styles.rowBgActive : ''}`}
                                onClick={() => onSelectOperation?.(op)}
                            >
                                {planPos && (
                                    <div className={`${styles.bar} ${styles.barPlan}`} style={{ left: planPos.left, width: planPos.width }} title={`План: ${op.originalPlannedStart}`} />
                                )}
                                {predictPos && (
                                    <div className={`${styles.bar} ${styles.barPredict}`} style={{ left: predictPos.left, width: predictPos.width }} title="Прогноз" />
                                )}
                                {actualPos && (
                                    <div className={`${styles.bar} ${styles.barActual}`} style={{ left: actualPos.left, width: actualPos.width }} title="Факт" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
