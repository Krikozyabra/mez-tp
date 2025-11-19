import { createContext, useContext, useState } from 'react';

const RoleContext = createContext(null);

export const RoleProvider = ({ children }) => {
    const [role, setRole] = useState('technolog');

    const toggleRole = () => {
        setRole((prev) => (prev === 'technolog' ? 'master' : 'technolog'));
    };

    return (
        <RoleContext.Provider value={{ role, setRole, toggleRole }}>
            {children}
        </RoleContext.Provider>
    );
};

export const useRole = () => {
    const context = useContext(RoleContext);
    if (!context) {
        throw new Error('useRole must be used within a RoleProvider');
    }
    return context;
};

