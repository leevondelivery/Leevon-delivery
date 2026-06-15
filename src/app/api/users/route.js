import { NextResponse } from "next/server";
import connectionToDatabase from "lib/mongoose";
import User from "../../../../models/User";
import crypto from "crypto";

export async function POST(request) {
  try {
    await connectionToDatabase();
    const { name, email, phone, password, dateOfBirth, referralCode, blickstatus } = await request.json();

    if (referralCode) {
      const CouponCode = (await import("../../../../models/CouponCode")).default;
      const isValidCoupon = await CouponCode.findOne({ couponCode: referralCode });
      if (!isValidCoupon) {
         return NextResponse.json({ error: "Invalid Coupon Code" }, { status: 400 });
      }
    }



    // Hash password using SHA-256
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    const newUser = new User({ 
      name, 
      email, 
      phone, 
      referralCode,
      password: hashedPassword, 
      dateOfBirth,
      blickstatus: blickstatus ?? true 
    });
    await newUser.save();

    return NextResponse.json(newUser, { status: 200 });


  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }

}

export async function GET(request) {
  try {
    await connectionToDatabase();

    // Get query params
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (phone) {
      // Optimized query: Find only the specific user
      const user = await User.findOne({ phone });
      return NextResponse.json(user ? [user] : [], { status: 200 });
    }

    // Default: Fetch all users (Legacy behavior, use with caution on large DBs)
    const users = await User.find();
    return NextResponse.json(users, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

