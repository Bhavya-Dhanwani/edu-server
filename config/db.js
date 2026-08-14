import { Sequelize } from 'sequelize';
import dns from 'dns';
import 'dotenv/config';

// Fix for Node.js pg driver: Bypass local ISP DNS CNAME lookup failures for Neon PostgreSQL host
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Ignore if restricted
}

const originalDnsLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname && typeof hostname === 'string' && hostname.includes('neon.tech')) {
    dns.resolve4(hostname, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        if (options && options.all) {
          return callback(
            null,
            addresses.map((addr) => ({ address: addr, family: 4 }))
          );
        }
        return callback(null, addresses[0], 4);
      }
      return originalDnsLookup(hostname, options, callback);
    });
  } else {
    return originalDnsLookup(hostname, options, callback);
  }
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('❌ FATAL: DATABASE_URL is not defined in environment variables.');
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  protocol: 'postgres',
  
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, 
    },
    keepAlive: true,
  },

  
  pool: {
    max: 10,
    min: 0,            
    acquire: 30000,    
    idle: 10000,       
  },

  retry: {
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
      /TimeoutError/,
      /ENOTFOUND/,
      /getaddrinfo/
    ],
    max: 5,
    backoffBase: 1000,
    backoffExponent: 1.5,
  },

  
  logging: process.env.NODE_ENV === 'development' 
    ? (sql) => console.log(`📖 SQL: ${sql}`) 
    : false,

  define: {
    underscored: true, 
    timestamps: true,
    paranoid: true,    
  },
});


export const connectWithRetry = async () => {
  console.log('⏳ Attempting to connect to the database...');
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (err) {
    console.error('❌ Database connection failed. Retrying in 5 seconds...', err.message);
    setTimeout(connectWithRetry, 5000);
  }
};

export default sequelize;