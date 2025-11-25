# models.py
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone

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
    description = models.TextField(verbose_name="Описание/Чертеж")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Создатель")
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
    assembly_shop = models.ForeignKey(AssemblyShop, on_delete=models.CASCADE, verbose_name="Сборочный цех")
    executors = models.ManyToManyField(Executor, verbose_name="Исполнители")

    name = models.CharField(max_length=255, verbose_name="Название операции", default="Операция")
    description = models.TextField(verbose_name="Описание операции", blank=True, null=True)
    
    priority = models.IntegerField(verbose_name="Приоритет в сборочном цехе")

    planned_start = models.DateTimeField(verbose_name="Плановая дата начала")
    planned_end = models.DateTimeField(verbose_name="Плановая дата окончания")

    actual_start = models.DateTimeField(null=True, blank=True, verbose_name="Фактическая дата начала")
    actual_end = models.DateTimeField(null=True, blank=True, verbose_name="Фактическая дата окончания")

    needs_master_check = models.BooleanField(default=False, verbose_name="Требуется проверка мастером")
    master_checker = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        verbose_name="Проверяющий"
    )
    completed = models.BooleanField(default=False, verbose_name="Выполнено")
    
    def clean(self):

        if self.planned_start and self.planned_end and self.planned_start >= self.planned_end:
            raise ValidationError("Дата окончания должна быть позже даты начала")

        if self.priority < 1:
            raise ValidationError("Приоритет операции должен быть положительным числом")

        if self.master_checker and not self.needs_master_check:
            raise ValidationError("Проверяющий может быть назначен только если требуется проверка мастером")
    
    def save(self, *args, **kwargs):

        if self.actual_end and not self.completed:
            self.completed = True

        if self.actual_end and not self.actual_start and self.planned_start and self.planned_end:
            duration = self.planned_end - self.planned_start
            self.actual_start = self.actual_end - duration

        if not self.needs_master_check:
            self.master_checker = None
        
        super().save(*args, **kwargs)
    
    def duration_minutes(self):
        """Длительность операции в минутах"""
        if self.planned_start and self.planned_end:
            return int((self.planned_end - self.planned_start).total_seconds() / 60)
        return 0
    
    @property
    def status(self):
        if self.completed:
            return "completed"
        elif self.actual_start:
            return "in_progress"
        else:
            return "planned"
    
    def __str__(self):
        return f"{self.name} (Приоритет: {self.priority})"
    
    class Meta:
        verbose_name = "Операция"
        verbose_name_plural = "Операции"
        ordering = ['priority']
        indexes = [
            models.Index(fields=['order', 'priority']),
            models.Index(fields=['assembly_shop', 'planned_start']),
        ]