import { useState } from 'react';
import GanttChart from './GanttChart';
import styles from './OrderItem/OrderItem.module.css'; // Используем те же стили, что у заказов

const ExecutorItem = ({
  executor,
  // Пропсы для управления
  onToggle,
  isExpanded,
  
  // Пропсы для графика
  timelineStartDate,
  daysRange,
  onEditOperation,
  currentUser,
  onInitiateStart,
  onInitiateFinish
}) => {
  // Если у исполнителя нет задач, можно показывать заглушку или пустой массив
  const hasOperations = executor.operations && executor.operations.length > 0;
  const fallbackTimelineStart = timelineStartDate || (hasOperations ? executor.operations[0].startDate : new Date().toISOString().split('T')[0]);

  return (
    <div className={styles.orderCard}>
      <div className={styles.orderHeader} onClick={() => onToggle(executor.id)}>
        <div className={styles.titleBlock}>
          <span className={styles.orderTitle}>{executor.title}</span>
          <span className={styles.operationsCount}>
             Активных задач: {executor.activeTasks} / Всего: {executor.totalTasks}
          </span>
        </div>
      </div>
      
      {isExpanded && hasOperations && (
        <div className={styles.operationsLayout}>
          <GanttChart
            operations={executor.operations}
            timelineStartDate={fallbackTimelineStart}
            // У исполнителя нет общего дедлайна, можно не передавать или передать null
            orderDeadline={null} 
            orderTitle={`Задачи: ${executor.title}`}
            compact
            
            // Разрешаем редактирование (открытие формы заказа) по клику на полоску
            onEditOperation={onEditOperation}
            canEdit={true} // Технолог может смотреть детали
            
            daysRange={daysRange}
            currentUser={currentUser}
            onInitiateStart={onInitiateStart}
            onInitiateFinish={onInitiateFinish}
          />
        </div>
      )}
      
      {isExpanded && !hasOperations && (
          <div style={{padding: '16px', color: '#64748b', fontSize: '14px'}}>
              Нет назначенных задач
          </div>
      )}
    </div>
  );
};

export default ExecutorItem;