# admin.py
from django.contrib import admin
from django.contrib.auth.models import Group, User
from django.contrib.auth.admin import UserAdmin
from .models import AssemblyShop, Executor, Order, Operation


class CustomUserAdmin(UserAdmin):
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "get_groups",
        "is_staff",
    )
    list_filter = ("groups", "is_staff", "is_superuser")

    def get_groups(self, obj):
        return ", ".join([group.name for group in obj.groups.all()])

    get_groups.short_description = "Группы"


admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


@admin.register(AssemblyShop)
class AssemblyShopAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Executor)
class ExecutorAdmin(admin.ModelAdmin):
    list_display = ("full_name", "get_assembly_shops")
    list_filter = ("assembly_shops",)
    search_fields = ("full_name", "user__username")
    filter_horizontal = ("assembly_shops",)

    def get_assembly_shops(self, obj):
        return ", ".join([shop.name for shop in obj.assembly_shops.all()])

    get_assembly_shops.short_description = "Рабочие цехи"


class OperationInline(admin.TabularInline):
    model = Operation
    extra = 1
    fields = (
        "name",
        "priority",
        "assembly_shop",
        "planned_start",
        "planned_end",
        "completed",
        "needs_master_check",
    )
    readonly_fields = ("completed",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "created_by",
        "created_at",
        "get_operations_count",
        "get_status",
    )
    list_filter = ("created_at", "created_by")
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at")
    inlines = [OperationInline]

    def get_operations_count(self, obj):
        return obj.operations.count()

    get_operations_count.short_description = "Количество операций"

    def get_status(self, obj):
        operations = obj.operations.all()
        if not operations:
            return "Нет операций"
        completed_count = operations.filter(completed=True).count()
        total_count = operations.count()
        return f"{completed_count}/{total_count}"

    get_status.short_description = "Статус выполнения"

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Operation)
class OperationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "order",
        "priority",
        "assembly_shop",
        "planned_start",
        "planned_end",
        "actual_start",
        "actual_end",
        "completed",
        "needs_master_check",
        "master_checker",
        "get_checker_role_display",
        "get_status_display",
    )
    list_filter = (
        "assembly_shop",
        "completed",
        "needs_master_check",
        "master_checker",
        "planned_start",
        "order",
    )
    search_fields = ("name", "order__name", "assembly_shop__name", "description")
    readonly_fields = (
        "completed",
        "get_duration_display",
        "get_status_display",
        "get_checker_role_display",
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
                    "priority",
                    "executors",
                )
            },
        ),
        (
            "Плановые даты",
            {"fields": ("planned_start", "planned_end", "get_duration_display")},
        ),
        ("Фактические даты", {"fields": ("actual_start", "actual_end", "completed")}),
        (
            "Контроль качества",
            {
                "fields": (
                    "needs_master_check",
                    "master_checker",
                    "get_checker_role_display",
                )
            },
        ),
        ("Статус", {"fields": ("get_status_display",)}),
    )

    def get_duration_display(self, obj):
        return f"{obj.duration_minutes()} минут"

    get_duration_display.short_description = "Длительность"

    def get_status_display(self, obj):
        """Определяет статус операции"""
        if obj.completed:
            return "Выполнено"
        elif obj.actual_start:
            return "В работе"
        else:
            return "Запланировано"

    get_status_display.short_description = "Статус"

    def get_checker_role_display(self, obj):
        """Показывает роль проверяющего"""
        if not obj.master_checker:
            return "Технолог"
        elif obj.master_checker.groups.filter(name="Мастер").exists():
            return "Мастер"
        else:
            return "Проверяющий"

    get_checker_role_display.short_description = "Роль проверяющего"

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)

        form.base_fields["master_checker"].help_text = (
            "Может быть назначен любой пользователь. Если не назначен - проверку выполняет технолог."
        )
        return form


class GroupAdmin(admin.ModelAdmin):
    list_display = ("name", "get_users_count")
    filter_horizontal = ("permissions",)

    def get_users_count(self, obj):
        return obj.user_set.count()

    get_users_count.short_description = "Количество пользователей"


admin.site.unregister(Group)
admin.site.register(Group, GroupAdmin)

admin.site.site_header = "Панель управления производством"
admin.site.site_title = "Админка MEZ"
admin.site.index_title = "Управление данными системы"
