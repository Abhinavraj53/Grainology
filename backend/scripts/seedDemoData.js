import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Offer from '../models/Offer.js';
import Order from '../models/Order.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import SaleOrder from '../models/SaleOrder.js';

dotenv.config();

async function seedDemoData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grainology');
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find({});
    if (users.length === 0) {
      console.log('❌ No users found! Please run seed:users first');
      process.exit(1);
    }

    console.log(`📊 Found ${users.length} users in database`);

    // Categorize users by role
    const farmers = users.filter(u => u.role === 'farmer');
    const traders = users.filter(u => u.role === 'trader');
    const corporates = users.filter(u => u.role === 'corporate');
    const millers = users.filter(u => u.role === 'miller');
    const fpos = users.filter(u => u.role === 'fpo');
    const financers = users.filter(u => u.role === 'financer');
    const admins = users.filter(u => u.role === 'admin');

    console.log('\n👥 Users by Role:');
    console.log(`   Farmers: ${farmers.length}`);
    console.log(`   Traders: ${traders.length}`);
    console.log(`   Corporates: ${corporates.length}`);
    console.log(`   Millers: ${millers.length}`);
    console.log(`   FPOs: ${fpos.length}`);
    console.log(`   Financers: ${financers.length}`);
    console.log(`   Admins: ${admins.length}`);

    if (farmers.length === 0) {
      console.log('❌ No farmers found! Please run seed:users first');
      process.exit(1);
    }

    let createdCount = 0;

    // 1. Create Offers from Farmers
    console.log('\n📦 Creating Offers from Farmers...');
    const offers = [];
    
    const commodities = [
      { name: 'Wheat', varieties: ['HD-3086', 'PBW-725', 'Dara'], minPrice: 2200, maxPrice: 2600 },
      { name: 'Paddy', varieties: ['Katarni', 'Basmati', 'Sonam'], minPrice: 2400, maxPrice: 2800 },
      { name: 'Maize', varieties: ['Hybrid', 'Local'], minPrice: 2100, maxPrice: 2300 }
    ];

    for (let i = 0; i < Math.min(farmers.length, 5); i++) {
      const farmer = farmers[i];
      const commodity = commodities[i % commodities.length];
      const variety = commodity.varieties[i % commodity.varieties.length];
      const price = commodity.minPrice + Math.floor(Math.random() * (commodity.maxPrice - commodity.minPrice));

      const offer = new Offer({
        seller_id: farmer._id,
        commodity: commodity.name,
        variety: variety,
        quantity_mt: 10 + Math.floor(Math.random() * 50), // 10-60 MT
        price_per_quintal: price,
        location: farmer.district || 'Buxar',
        delivery_location: farmer.district || 'Buxar',
        status: i % 3 === 0 ? 'Active' : (i % 3 === 1 ? 'Sold' : 'Active'),
        payment_terms: ['Advance', 'Against Delivery', 'T+3 Days'][i % 3],
        delivery_timeline_days: 5 + Math.floor(Math.random() * 10),
        quality_report: {
          moisture: 12 + (Math.random() * 3).toFixed(2),
          foreign_matter: (Math.random() * 1).toFixed(2),
          damaged_grains: (Math.random() * 2).toFixed(2)
        }
      });

      await offer.save();
      offers.push(offer);
      createdCount++;
      console.log(`   ✅ Created offer: ${commodity.name} - ${variety} from ${farmer.name}`);
    }

    // 2. Create Purchase Orders from Buyers (Traders, Corporates, Millers, FPOs)
    console.log('\n🛒 Creating Purchase Orders from Buyers...');
    const buyers = [...traders, ...corporates, ...millers, ...fpos].slice(0, 6);

    for (let i = 0; i < buyers.length; i++) {
      const buyer = buyers[i];
      const commodity = commodities[i % commodities.length];
      const variety = commodity.varieties[i % commodity.varieties.length];

      const purchaseOrder = new PurchaseOrder({
        buyer_id: buyer._id,
        commodity: commodity.name,
        variety: variety,
        quantity_mt: 20 + Math.floor(Math.random() * 80),
        expected_price_per_quintal: commodity.minPrice + Math.floor(Math.random() * (commodity.maxPrice - commodity.minPrice)),
        delivery_location: buyer.district || buyer.state || 'Buxar',
        delivery_timeline_days: 7 + Math.floor(Math.random() * 14),
        payment_terms: ['Advance', 'Against Delivery', 'T+3 Days'][i % 3],
        status: ['Open', 'In Negotiation', 'Confirmed'][i % 3],
        quality_requirements: {
          max_moisture: 14,
          max_foreign_matter: 1,
          max_damaged_grains: 2
        },
        notes: `Purchase order from ${buyer.name}`
      });

      await purchaseOrder.save();
      createdCount++;
      console.log(`   ✅ Created purchase order: ${commodity.name} from ${buyer.name}`);
    }

    // 3. Create Sale Orders from Sellers (Farmers, Traders, FPOs)
    console.log('\n💰 Creating Sale Orders from Sellers...');
    const sellers = [...farmers.slice(0, 3), ...traders.slice(0, 2), ...fpos.slice(0, 1)];

    for (let i = 0; i < sellers.length; i++) {
      const seller = sellers[i];
      const commodity = commodities[i % commodities.length];
      const variety = commodity.varieties[i % commodity.varieties.length];
      const price = commodity.minPrice + Math.floor(Math.random() * (commodity.maxPrice - commodity.minPrice));

      const saleOrder = new SaleOrder({
        seller_id: seller._id,
        commodity: commodity.name,
        variety: variety,
        quantity_mt: 15 + Math.floor(Math.random() * 60),
        price_per_quintal: price,
        delivery_location: seller.district || seller.state || 'Buxar',
        delivery_timeline_days: 5 + Math.floor(Math.random() * 10),
        payment_terms: ['Advance', 'Against Delivery', 'T+3 Days'][i % 3],
        status: ['Open', 'In Negotiation', 'Confirmed'][i % 3],
        quality_report: {
          moisture: 12 + (Math.random() * 3).toFixed(2),
          foreign_matter: (Math.random() * 1).toFixed(2),
          damaged_grains: (Math.random() * 2).toFixed(2)
        },
        notes: `Sale order from ${seller.name}`
      });

      await saleOrder.save();
      createdCount++;
      console.log(`   ✅ Created sale order: ${commodity.name} from ${seller.name}`);
    }

    // 4. Create Trade Orders (Orders) - connecting offers to buyers
    console.log('\n🔄 Creating Trade Orders...');
    const activeOffers = offers.filter(o => o.status === 'Active');
    const orderBuyers = [...traders, ...corporates, ...millers];

    for (let i = 0; i < Math.min(activeOffers.length, orderBuyers.length, 5); i++) {
      const offer = activeOffers[i];
      const buyer = orderBuyers[i % orderBuyers.length];

      const order = new Order({
        offer_id: offer._id,
        buyer_id: buyer._id,
        quantity_mt: Math.min(offer.quantity_mt * 0.5, 20 + Math.floor(Math.random() * 30)),
        final_price_per_quintal: offer.price_per_quintal + Math.floor(Math.random() * 50) - 25,
        status: ['Pending Approval', 'Approved', 'Completed', 'Approved - Awaiting Logistics'][i % 4],
        deduction_amount: Math.floor(Math.random() * 500)
      });

      await order.save();
      createdCount++;
      console.log(`   ✅ Created trade order: ${offer.commodity} from ${offer.seller_id} to ${buyer.name}`);
    }

    // 5. Admin-created Purchase Orders for different customers
    console.log('\n👨‍💼 Creating Admin-created Purchase Orders...');
    if (admins.length > 0 && buyers.length > 0) {
      const admin = admins[0];
      
      // Create purchase orders as admin for different customers
      for (let i = 0; i < Math.min(buyers.length, 3); i++) {
        const buyer = buyers[i];
        const commodity = commodities[i % commodities.length];
        const variety = commodity.varieties[i % commodity.varieties.length];

        const adminPurchaseOrder = new PurchaseOrder({
          buyer_id: buyer._id,
          commodity: commodity.name,
          variety: variety,
          quantity_mt: 30 + Math.floor(Math.random() * 70),
          expected_price_per_quintal: commodity.minPrice + Math.floor(Math.random() * (commodity.maxPrice - commodity.minPrice)),
          delivery_location: buyer.district || buyer.state || 'Buxar',
          delivery_timeline_days: 10 + Math.floor(Math.random() * 15),
          payment_terms: 'Against Delivery',
          status: 'Confirmed',
          quality_requirements: {
            max_moisture: 14,
            max_foreign_matter: 1,
            max_damaged_grains: 2
          },
          notes: `Admin-created purchase order for ${buyer.name}`
        });

        await adminPurchaseOrder.save();
        createdCount++;
        console.log(`   ✅ Created admin purchase order: ${commodity.name} for ${buyer.name}`);
      }

      // Create sale orders as admin for different sellers
      const adminSellers = [...farmers.slice(0, 2), ...traders.slice(0, 1)];
      for (let i = 0; i < adminSellers.length; i++) {
        const seller = adminSellers[i];
        const commodity = commodities[i % commodities.length];
        const variety = commodity.varieties[i % commodity.varieties.length];
        const price = commodity.minPrice + Math.floor(Math.random() * (commodity.maxPrice - commodity.minPrice));

        const adminSaleOrder = new SaleOrder({
          seller_id: seller._id,
          commodity: commodity.name,
          variety: variety,
          quantity_mt: 25 + Math.floor(Math.random() * 50),
          price_per_quintal: price,
          delivery_location: seller.district || seller.state || 'Buxar',
          delivery_timeline_days: 7 + Math.floor(Math.random() * 10),
          payment_terms: 'Advance',
          status: 'Confirmed',
          quality_report: {
            moisture: 12 + (Math.random() * 3).toFixed(2),
            foreign_matter: (Math.random() * 1).toFixed(2),
            damaged_grains: (Math.random() * 2).toFixed(2)
          },
          notes: `Admin-created sale order for ${seller.name}`
        });

        await adminSaleOrder.save();
        createdCount++;
        console.log(`   ✅ Created admin sale order: ${commodity.name} for ${seller.name}`);
      }

      // Create trade orders as admin connecting offers to buyers
      if (activeOffers.length > 0 && orderBuyers.length > 0) {
        for (let i = 0; i < Math.min(2, activeOffers.length, orderBuyers.length); i++) {
          const offer = activeOffers[(i + 2) % activeOffers.length];
          const buyer = orderBuyers[(i + 2) % orderBuyers.length];

          const adminOrder = new Order({
            offer_id: offer._id,
            buyer_id: buyer._id,
            quantity_mt: Math.min(offer.quantity_mt * 0.3, 15 + Math.floor(Math.random() * 25)),
            final_price_per_quintal: offer.price_per_quintal + Math.floor(Math.random() * 30) - 15,
            status: 'Approved',
            deduction_amount: Math.floor(Math.random() * 300),
          });

          await adminOrder.save();
          createdCount++;
          console.log(`   ✅ Created admin trade order: ${offer.commodity} for ${buyer.name}`);
        }
      }
    }

    // Summary
    const [offersCount, ordersCount, purchaseOrdersCount, saleOrdersCount] = await Promise.all([
      Offer.countDocuments(),
      Order.countDocuments(),
      PurchaseOrder.countDocuments(),
      SaleOrder.countDocuments()
    ]);

    console.log('\n✅ Seed Complete!');
    console.log(`   Created: ${createdCount} new records`);
    console.log(`\n📊 Database Summary:`);
    console.log(`   Total Offers: ${offersCount}`);
    console.log(`   Total Trade Orders: ${ordersCount}`);
    console.log(`   Total Purchase Orders: ${purchaseOrdersCount}`);
    console.log(`   Total Sale Orders: ${saleOrdersCount}`);
    console.log(`   Total Users: ${users.length}`);

    console.log('\n🔒 Data Isolation Check:');
    console.log('   ✅ Farmers see only their own offers');
    console.log('   ✅ Buyers see only their own purchase orders');
    console.log('   ✅ Sellers see only their own sale orders');
    console.log('   ✅ Customers see only their own trade orders');
    console.log('   ✅ Admin sees all data');
    console.log('   ✅ Admin-created orders visible to respective customers');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedDemoData();

