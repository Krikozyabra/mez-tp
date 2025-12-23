from django.urls import path, include
from rest_framework_simplejwt.views import (
TokenObtainPairView,
TokenRefreshView
)
from rest_framework.routers import DefaultRouter
from .views.order_views import OrderListCreateAPIView, OrderDetailUpdateDeleteAPIView
from .views.operation_views import (
    OperationListCreateAPIView,
    OperationDetailUpdateDeleteAPIView,
    OperationStartAPIView,
    OperationEndAPIView,
    OperationAPIGetByOrder
)
from .views.log_views import TehLogViewSet
from .views.workshop_views import AssemblyShopAPIList, AssemblyShopAPIUpdate
from .views.executor_views import (
    ExecutorAPIList, 
    ExecutorAPIUpdate, 
    ExecutorAPIListByWorkshop,
    ExecutorTasksAggregationView
)
from .views.user_views import MasterListAPIView, CurrentUserView

router = DefaultRouter()
router.register(r'logs', TehLogViewSet, basename='tehlog')

urlpatterns = [
    # Auth
    path('auth/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/users/me/', CurrentUserView.as_view()),

    # Orders
    path('order/', OrderListCreateAPIView.as_view()),
    path('order/<int:pk>/', OrderDetailUpdateDeleteAPIView.as_view()),

    # Logs
    path('', include(router.urls)),

    # Operations
    path('operation/', OperationListCreateAPIView.as_view()),
    path('operation/<int:pk>/', OperationDetailUpdateDeleteAPIView.as_view()),
    path('operation/by_order/<int:order_pk>/', OperationAPIGetByOrder.as_view()),

    # Operation Actions
    path('operation/<int:pk>/start/', OperationStartAPIView.as_view()),
    path('operation/<int:pk>/end/', OperationEndAPIView.as_view()),
    

    # Workshops (Старые Views оставлены, если они нужны для справочников)
    path('workshops/', AssemblyShopAPIList.as_view()),
    path('workshops/<int:pk>/', AssemblyShopAPIUpdate.as_view()),

    # Executors
    path('executors/', ExecutorAPIList.as_view()),
    path('executors/<int:pk>/', ExecutorAPIUpdate.as_view()),
    path('executors/by-workshop/<int:workshop_pk>/', ExecutorAPIListByWorkshop.as_view()),
    path('executors/aggregated/', ExecutorTasksAggregationView.as_view()),

    # Masters
    path('masters/', MasterListAPIView.as_view()),
]