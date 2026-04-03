import { withAuth } from "next-auth/middleware";

export default withAuth({
    callbacks: {
        authorized: ({ token }) => {
            return !!token; // only logged-in users
        },
    },
});

export const config = {
    matcher: ["/dashboard"],
};