import { Provider, Role, User } from "@prisma/client";
import { Exclude } from "class-transformer";

export class UserResponse implements User {
    id:        string;
    email:     string;
    avatar:    string;
    fullName:  string;

    @Exclude()
    password:  string;

    @Exclude()
    provider: Provider;

    @Exclude()
    isBlocked: boolean;

    @Exclude()
    createdAt: Date;
    updatedAt: Date;
    roles:     Role[]

    constructor(user: User){
        Object.assign(this, user)
    }
}