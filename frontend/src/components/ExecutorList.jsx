import ExecutorItem from './ExecutorItem';
import styles from './OrderList/OrderList.module.css'; // Те же стили списка

const ExecutorList = ({
  executors,
  expandedIds,
  onToggleExecutor,
  
  // Пропсы для графика
  timelineStartByExecutor, // Если хотите разное начало для каждого, или общее
  commonTimelineStart,     // Или одно общее
  
  onEditOperation,
  daysRange,
  currentUser,
  onInitiateStart,
  onInitiateFinish
}) => {
    return (
        <div className={styles.list}>
            {executors.map((executor) => (
                <ExecutorItem
                    key={executor.id}
                    executor={executor}
                    isExpanded={expandedIds.has(executor.id)}
                    onToggle={onToggleExecutor}
                    
                    timelineStartDate={commonTimelineStart}
                    daysRange={daysRange}
                    
                    onEditOperation={onEditOperation}
                    currentUser={currentUser}
                    onInitiateStart={onInitiateStart}
                    onInitiateFinish={onInitiateFinish}
                />
            ))}
        </div>
    );
};

export default ExecutorList;