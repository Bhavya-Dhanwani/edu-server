import sequelize from "../config/db.js";
import "../models/index.js";
import Plan from "../models/Plan.js";

const seedPlans = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log("🚀 Starting Plan seeding...");

    const plans = [
      {
        name: "Free Trial",
        slug: "free-trial",
        description: "14 days free trial",
        monthlyPrice: 0,
        yearlyPrice: 0,
        currency: "INR",
        features: {
          maxStudents: 100,
          hasTransport: false,
          hasLMS: false,
          hasExams: true,
          storageLimitGb: 5,
        },
      },
      {
        name: "Basic",
        slug: "basic",
        description: "Basic plan for small schools",
        monthlyPrice: 999,
        yearlyPrice: 9999,
        currency: "INR",
        features: {
          maxStudents: 500,
          hasTransport: true,
          hasLMS: false,
          hasExams: true,
          storageLimitGb: 20,
        },
      },
      {
        name: "Premium",
        slug: "premium",
        description: "Premium plan with all features",
        monthlyPrice: 2499,
        yearlyPrice: 24999,
        currency: "INR",
        features: {
          maxStudents: -1,
          hasTransport: true,
          hasLMS: true,
          hasExams: true,
          storageLimitGb: 200,
        },
      },
    ];

    for (const plan of plans) {
      const existingPlan = await Plan.findOne({
        where: { slug: plan.slug },
        transaction,
      });

      if (existingPlan) {
        console.log(`✅ ${plan.name} already exists`);
        continue;
      }

      await Plan.create(plan, { transaction });

      console.log(`✅ ${plan.name} created`);
    }

    await transaction.commit();

    console.log("\n🎉 Plan seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();

    console.error("❌ Plan seeding failed");
    console.error(error);

    process.exit(1);
  }
};

seedPlans();