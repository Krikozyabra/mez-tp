# models.py
from django.db import models
from django.contrib.auth.models import User, AbstractUser
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('master', 'Мастер'),
        ('technolog', 'Технолог'),
        ('admin', 'Администратор'),
    )
    
    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        blank=True,
        null=True
    )
    
    def __str__(self):
        return str(self.username)

class AssemblyShop(models.Model):
    name = models.CharField(max_length=255, verbose_name="Название цеха")
    
    def __str__(self):
        return str(self.name)
    
    class Meta:
        verbose_name = "Сборочный цех"
        verbose_name_plural = "Сборочные цехи"

class Executor(models.Model):
    full_name = models.CharField(max_length=255, verbose_name="ФИО")
    assembly_shops = models.ManyToManyField(AssemblyShop, verbose_name="Рабочие цехи")
    
    def __str__(self):
        return str(self.full_name)
    
    class Meta:
        verbose_name = "Исполнитель"
        verbose_name_plural = "Исполнители"

class Order(models.Model):
    name = models.CharField(max_length=255, verbose_name="Название заказа")
    description = models.TextField(verbose_name="Описание/Чертеж", null=True, blank=True)
    default_master = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Мастер по умолчанию",
        related_name="mastered_orders"
    )
    deadline = models.DateTimeField(verbose_name="Дедлайн")

    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, verbose_name="Создатель")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    
    def __str__(self):
        return f"{self.name}"
    
    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"
        ordering = ['created_at']

class Operation(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, verbose_name="Заказ", related_name='operations')
    name = models.CharField(max_length=255, verbose_name="Название операции", default="Операция")
    description = models.TextField(verbose_name="Описание операции", blank=True, null=True)
    
    assembly_shop = models.ForeignKey(
        AssemblyShop, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        verbose_name="Сборочный цех"
    )
    executors = models.ManyToManyField(Executor, verbose_name="Исполнители", blank=True)

    master = models.ForeignKey(
        CustomUser, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        verbose_name="Ответственный мастер"
    )
    
    next_operation = models.OneToOneField(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='previous_operation',
        verbose_name="Следующая (зависимая) операция"
    )

    planned_start = models.DateTimeField(verbose_name="Плановая дата начала")
    planned_end = models.DateTimeField(verbose_name="Плановая дата окончания")

    predict_start = models.DateTimeField(verbose_name="Прогнозируемая дата начала")
    predict_end = models.DateTimeField(verbose_name="Прогнозируемая дата окончания")

    actual_start = models.DateTimeField(null=True, blank=True, verbose_name="Фактическая дата начала")
    actual_end = models.DateTimeField(null=True, blank=True, verbose_name="Фактическая дата окончания")
    
    def clean(self):
        if self.planned_start and self.planned_end and self.planned_start >= self.planned_end:
            raise ValidationError("Дата окончания должна быть позже даты начала")
    
    def save(self, *args, **kwargs):
        if not self.pk:
            if not self.predict_start:
                self.predict_start = self.planned_start
            if not self.predict_end:
                self.predict_end = self.planned_end
            
            if not self.master and self.order.default_master:
                self.master = self.order.default_master
                
        if self.pk == self.next_operation:
            self.next_operation = None

        super().save(*args, **kwargs)
    
    @property
    def duration(self):
        if self.planned_end and self.planned_start:
            return self.planned_end - self.planned_start
        return timedelta(0)
    
    @property
    def status(self):
        if self.actual_end:
            return "completed"
        elif self.actual_start:
            return "in_progress"
        else:
            return "planned"
    
    def __str__(self):
        return f"{self.name}"
    
    class Meta:
        verbose_name = "Операция"
        verbose_name_plural = "Операции"
        ordering = ['predict_start']
        
class TehLog(models.Model):
    class LogType(models.IntegerChoices):
        LATE_START = 0
        LATE_STOP = 1
        AHEAD_START = 2
        AHEAD_STOP = 3
    
    logged_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    master = models.ForeignKey(CustomUser, on_delete=models.CASCADE, verbose_name="Мастер")
    info = models.CharField(max_length=256, verbose_name="Информация")
    type = models.IntegerField(choices=LogType, verbose_name="Тип лога")
    operation = models.ForeignKey(Operation, on_delete=models.CASCADE, verbose_name="Операция")
    
    def __str__(self):
        return str(TehLog.LogType.choices[self.type][1]) + " " +str(self.operation)
    
    class Meta:
        verbose_name = "Логи"
        verbose_name_plural = "Логи"