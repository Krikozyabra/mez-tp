import { useState } from 'react';
import MainPage from './pages/MainPage';
import OrderFormPage from './pages/OrderFormPage';
import { sampleOrders } from './mock/sampleOrders';

const App = () => {
    const [currentPage, setCurrentPage] = useState('main');
    const [editingOrder, setEditingOrder] = useState(null);
    const [orders, setOrders] = useState(sampleOrders);

    const handleCreateOrder = () => {
        setEditingOrder(null);
        setCurrentPage('orderForm');
    };

    const handleEditOrder = (order) => {
        setEditingOrder(order);
        setCurrentPage('orderForm');
    };

    const handleSaveOrder = (orderData) => {
        if (editingOrder) {
            // Редактирование существующего заказа
            setOrders(prev => prev.map(order => 
                order.id === orderData.id ? orderData : order
            ));
        } else {
            // Создание нового заказа
            setOrders(prev => [orderData, ...prev]);
        }
        setCurrentPage('main');
        setEditingOrder(null);
    };

    const handleDeleteOrder = () => {
        if (editingOrder && window.confirm('Вы уверены, что хотите удалить этот заказ?')) {
            setOrders(prev => prev.filter(order => order.id !== editingOrder.id));
            setCurrentPage('main');
            setEditingOrder(null);
        }
    };

    const handleCancel = () => {
        setCurrentPage('main');
        setEditingOrder(null);
    };

    if (currentPage === 'orderForm') {
        return (
            <OrderFormPage
                order={editingOrder}
                onSave={handleSaveOrder}
                onCancel={handleCancel}
                onDelete={handleDeleteOrder}
                allOrders={orders}
            />
        );
    }

    return (
        <MainPage
            orders={orders}
            setOrders={setOrders}
            onCreateOrder={handleCreateOrder}
            onEditOrder={handleEditOrder}
        />
    );
};

export default App;

