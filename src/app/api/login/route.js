import { NextResponse } from "next/server";
import connectionToDatabase from "lib/mongoose";
import User from "../../../../models/User";
import crypto from "crypto";

export async function POST(request) {
    try {
        await connectionToDatabase();
        const { phone, password } = await request.json();

        if (!phone || !password) {
            return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
        }

        let user = await User.findOne({ phone });

        if (!user) {
            return NextResponse.json({ error: "Account not found" }, { status: 401 });
        }

        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        const isPasswordCorrect = (user.password === password) || (user.password === hashedPassword);

        if (isPasswordCorrect) {
            if (user.blickstatus === false) {
                return NextResponse.json({ error: "Your ID was blocked" }, { status: 403 });
            }

            let showWalletPopup = false;
            // Check if they signed up with a referral code and haven't claimed the bonus yet
            if (user.referralCode && !user.signupBonusClaimed) {
                user.coins = (user.coins || 0) + 50;
                user.signupBonusClaimed = true;
                await user.save();
                showWalletPopup = true;
            }

            const responseUser = user.toObject();
            responseUser.showWalletPopup = showWalletPopup;

            return NextResponse.json(responseUser, { status: 200 });
        }

        return NextResponse.json({ error: "Invalid Mobile Number or Password" }, { status: 401 });

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
