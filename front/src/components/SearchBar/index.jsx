import styles from './SearchBar.module.css';

const SearchBar = ({ value, onChange, onToggleRole, currentRoleLabel }) => {
    return (
        <div className={styles.searchBar}>
            <input
                className={styles.input}
                placeholder="Поиск по заказам"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
            <button className={styles.roleButton} onClick={onToggleRole}>
                Сменить роль ({currentRoleLabel})
            </button>
        </div>
    );
};

export default SearchBar;
