import styles from './SearchBar.module.css';

const SearchBar = ({ value, onChange, onLoginClick, isAuthenticated, user }) => {
    return (
        <div className={styles.container}>
            <input
                className={styles.input}
                type="text"
                placeholder="Поиск заказа..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            
            {/* Заменили переключатель ролей на кнопку входа/выхода */}
            <div className={styles.authControl}>
                {isAuthenticated ? (
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{user?.username || 'Технолог'}</span>
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