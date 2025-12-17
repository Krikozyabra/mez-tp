from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.admin import UserAdmin
from django.db.models import Count, Q
from .models import AssemblyShop, Executor, Order, Operation, TehLog

# Получаем вашу кастомную модель пользователя
User = get_user_model()

# Настройка админки для кастомного пользователя
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "role",  # Добавили отображение роли
        "is_staff",
    )
    list_filter = ("role", "is_staff")
    
    # Добавляем поле 'role' в форму редактирования пользователя
    fieldsets = UserAdmin.fieldsets + (
        ('Дополнительная информация', {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Дополнительная информация', {'fields': ('role',)}),
    )


# 2. Цехи
@admin.register(AssemblyShop)
class AssemblyShopAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


# 3. Исполнители
@admin.register(Executor)
class ExecutorAdmin(admin.ModelAdmin):
    list_display = ("full_name", "get_assembly_shops")
    list_filter = ("assembly_shops",)
    search_fields = ("full_name",) # user__username убрал, если у Executor нет прямой связи с User, если есть - верните
    filter_horizontal = ("assembly_shops",)

    def get_assembly_shops(self, obj):
        return ", ".join([shop.name for shop in obj.assembly_shops.all()])

    get_assembly_shops.short_description = "Рабочие цехи"


# Инлайны для заказа
class OperationInline(admin.TabularInline):
    model = Operation
    extra = 1
    fields = ("name", "planned_start", "planned_end", "master", "next_operation")
    fk_name = "order"

# 4. Заказы
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("name", "deadline", "default_master", "created_at", "created_by")
    list_filter = ("created_at", "created_by", "deadline")
    inlines = [OperationInline]

    def get_operations_count(self, obj):
        return obj.operations.count()

    get_operations_count.short_description = "Количество операций"

    def get_status(self, obj):
        stats = obj.operations.aggregate(
            total=Count("id"),
            completed=Count("id", filter=Q(actual_end__isnull=False))
        )

        if stats["total"] == 0:
            return "Нет операций"

        return f'{stats["completed"]}/{stats["total"]}'

    get_status.short_description = "Статус выполнения"

    # Раскомментируйте этот блок, если в модели Order есть поле created_by
    # def save_model(self, request, obj, form, change):
    #     if not obj.pk:
    #         obj.created_by = request.user
    #     super().save_model(request, obj, form, change)


# 5. Операции
@admin.register(Operation)
class OperationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "order",
        "assembly_shop",
        "planned_start",
        "planned_end",
        "actual_start",
        "actual_end",
        "master",
        "get_status_display",
    )

    list_filter = (
        "assembly_shop",
        "order",
        "master",
        "planned_start",
        "actual_end",
    )

    search_fields = (
        "name",
        "order__name",
        "assembly_shop__name",
        "description",
    )

    readonly_fields = (
        "get_status_display",
        "predict_start",
        "predict_end",
    )

    filter_horizontal = ("executors",)

    date_hierarchy = "planned_start"

    fieldsets = (
        (
            "Основная информация",
            {
                "fields": (
                    "order",
                    "name",
                    "description",
                    "assembly_shop",
                    "executors",
                    "master",
                    "next_operation",
                )
            },
        ),
        (
            "Плановые даты",
            {
                "fields": (
                    "planned_start",
                    "planned_end",
                    "predict_start",
                    "predict_end",
                )
            },
        ),
        (
            "Фактические даты",
            {
                "fields": (
                    "actual_start",
                    "actual_end",
                )
            },
        ),
        (
            "Статус",
            {
                "fields": ("get_status_display",)
            },
        ),
    )

    def get_status_display(self, obj):
        """
        Возвращает статус операции для отображения в админке.
        Соответствует property status в модели:
        - actual_end → 'Завершена'
        - actual_start → 'В работе'
        - иначе → 'Запланирована'
        """
        if obj.actual_end:
            return "Завершена"
        elif obj.actual_start:
            return "В работе"
        return "Запланирована"

    get_status_display.short_description = "Статус"

@admin.register(TehLog)
class TehLogAdmin(admin.ModelAdmin):
    list_display = ("logged_at", "info", "type", "operation", "master")
    list_filter = ("logged_at",)

# Настройка заголовков админки
admin.site.site_header = "Панель управления производством"
admin.site.site_title = "Админ-панель MEZ"
admin.site.index_title = "Управление данными системы"