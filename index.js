import 'dotenv/config';
import app from './app.js';
import sequelize, { connectWithRetry } from './config/db.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectWithRetry();

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false   });
      console.log('🔹 Database models synchronized (alter mode)');
    }

    const server = app.listen(PORT, () => {
      console.log(`Backend active on port: ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    

    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        sequelize.close();
        console.log('Process terminated.');
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

