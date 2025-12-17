import styles from './SearchBar.module.css';
import NotificationBell from '../NotificationBell/NotificationBell'; // Импорт

const SearchBar = ({ value, onChange, onLoginClick, isAuthenticated, user }) => {
    // Проверка, является ли пользователем технологом (или админом, если нужно)
    // Обычно role приходит в объекте user
    const isTechnolog = user?.role === 'technolog' || user?.role === 'admin';

    return (
        <div className={styles.container}>
            <input
                className={styles.input}
                type="text"
                placeholder="Поиск заказа..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            
            <div className={styles.authControl}>
                {isAuthenticated ? (
                    <div className={styles.userInfo}>
                        {isTechnolog && <NotificationBell />}
                        
                        <span className={styles.userName}>
                            {user?.username || 'Пользователь'} ({user?.role === 'master' ? 'Мастер' : 'Технолог'})
                        </span>
                        <button className={styles.logoutButton} onClick={onLoginClick}>
                            Выйти
                        </button>
                    </div>
                ) : (
                    <button className={styles.loginButton} onClick={onLoginClick}>
                        Войти
                    </button>
                )}
            </div>
        </div>
    );
};

export default SearchBar;