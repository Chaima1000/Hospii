-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'nurse')),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User tokens for authentication
CREATE TABLE IF NOT EXISTS user_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Staff details (for doctors and nurses)
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    specialization VARCHAR(100),
    shift VARCHAR(20) CHECK (shift IN ('morning', 'afternoon', 'night')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(10) NOT NULL UNIQUE,
    room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('general', 'icu', 'isolation', 'operating', 'recovery')),
    capacity INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    blood_type VARCHAR(3) CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    admission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    discharge_date TIMESTAMP WITH TIME ZONE NULL,
    severity VARCHAR(10) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_isolated BOOLEAN DEFAULT FALSE,
    is_contagious BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_by INTEGER NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Patient diseases/conditions
CREATE TABLE IF NOT EXISTS patient_diseases (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    diagnosis_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'treated', 'chronic')),
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Patient treatments
CREATE TABLE IF NOT EXISTS patient_treatments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    treatment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(100) NOT NULL,
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id)
);

-- Room assignments
CREATE TABLE IF NOT EXISTS room_assignments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    assigned_by INTEGER NOT NULL,
    assignment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    discharge_date TIMESTAMP WITH TIME ZONE NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_room_assignments_patient ON room_assignments(patient_id);
CREATE INDEX idx_room_assignments_room ON room_assignments(room_id);
CREATE INDEX idx_patient_diseases ON patient_diseases(patient_id);
CREATE INDEX idx_patient_treatments ON patient_treatments(patient_id);

-- Insert initial admin user
INSERT INTO users (username, password, role, full_name, email) 
VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Administrator', 'admin@hospital.com');