from datetime import datetime, timezone as dt_timezone
from collections import defaultdict

def sort_operations_chain(operations):
    """
    Сортирует операции на основе previous_operation.
    1. Строит дерево: Родитель -> [Дети].
    2. Находит корни (операции без previous_operation или чей родитель не в текущем списке).
    3. Рекурсивно добавляет детей, сортируя их по времени.
    """
    # 1. Превращаем QuerySet в список и создаем мапу
    ops_list = list(operations)
    if not ops_list:
        return []

    # Map: id -> operation
    op_map = {op.id: op for op in ops_list}
    
    # Map: parent_id -> list[child_operations]
    # Используем related_name логику вручную для списка в памяти
    children_map = defaultdict(list)
    
    # Список операций, которые будут считаться корневыми в текущем наборе
    roots = []

    # 2. Распределяем операции
    for op in ops_list:
        parent_id = op.previous_operation_id
        
        # Если родитель есть и он находится в этом же списке -> добавляем в дети
        if parent_id and parent_id in op_map:
            children_map[parent_id].append(op)
        else:
            # Если родителя нет вообще ИЛИ родитель остался "за кадром" (фильтрация)
            # считаем эту операцию корневой для текущего отображения
            roots.append(op)

    # Дата-заглушка для сортировки
    min_date = datetime.min.replace(tzinfo=dt_timezone.utc)

    # 3. Сортируем корни по дате начала
    roots.sort(key=lambda x: x.planned_start or min_date)

    sorted_ops = []

    # 4. Рекурсивный обход (DFS) для построения плоского списка
    def visit(node):
        sorted_ops.append(node)
        
        # Получаем детей текущего узла
        children = children_map.get(node.id, [])
        
        # Сортируем детей между собой (кто раньше встал, того и тапки)
        children.sort(key=lambda x: x.planned_start or min_date)
        
        for child in children:
            visit(child)

    for root in roots:
        visit(root)

    return sorted_ops

def recalculate_predict_chain(start_operation):
    """
    Рекурсивно обновляет predict_start/predict_end для всех зависимых операций
    вниз по цепочке.
    """
    queue = list(start_operation.next_operations.all())
    visited = set()
    visited.add(start_operation.id)

    while queue:
        current_op = queue.pop(0)
        if current_op.id in visited:
            continue
        visited.add(current_op.id)

        parent = current_op.previous_operation
        if not parent:
            continue

        reference_end = parent.predict_end or parent.actual_end or parent.planned_end
        if reference_end:
            current_op.predict_start = reference_end
            current_op.predict_end = reference_end + current_op.duration
            current_op.save(update_fields=['predict_start', 'predict_end'])
            
            queue.extend(current_op.next_operations.all())