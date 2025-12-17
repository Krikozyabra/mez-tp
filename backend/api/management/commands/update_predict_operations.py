from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime
from api.models import Operation
from api.utils import recalculate_predict_chain


class Command(BaseCommand):
    help = "Ежедневное обновление predict_start/predict_end операций"

    def handle(self, *args, **kwargs):
        today = timezone.localdate()  # только дата, без времени
        # Все операции без previous_operation, не начавшиеся (actual_start = None)
        root_operations = Operation.objects.filter(previous_operation__isnull=True, actual_start__isnull=True)
        
        for op in root_operations:
            if op.predict_start and op.predict_start.date() < today:
                # Сдвигаем predict_start на сегодня
                op.predict_start = timezone.make_aware(
                    datetime.combine(today, op.predict_start.time())
                )
                op.predict_end = op.predict_start + op.duration
                op.save(update_fields=['predict_start', 'predict_end'])
                # Обновляем всех потомков рекурсивно
                recalculate_predict_chain(op)