import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './config/db.js';
import employeeRoutes from './routes/employeeRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import positionRoutes from './routes/positionRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import rewardPenaltyRoutes from './routes/rewardPenaltyRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import contractRoutes from './routes/contractRoutes.js';
import authRoutes from './routes/authRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import systemRoutes from './routes/systemRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/dieuchuyen', transferRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/rewards-penalties', rewardPenaltyRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api', systemRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'HR Management API (Quản lý Nhân sự)',
    status: 'Running',
    database: 'MySQL',
    endpoints: [
      '/api/health',
      '/api/employees',
      '/api/departments',
      '/api/positions',
      '/api/transfers',
      '/api/courses',
      '/api/attendance',
      '/api/payroll',
      '/api/contracts',
      '/api/leaves'
    ]
  });
});

// Khởi động server
async function startServer() {
  try {
    console.log('[Server] Đang kết nối và khởi tạo cơ sở dữ liệu MySQL...');
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Backend API đang chạy tại: http://localhost:${PORT}`);
      console.log(`🗄️  Cơ sở dữ liệu MySQL đã kết nối thành công!`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('❌ Không thể khởi động máy chủ do lỗi kết nối MySQL:');
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
