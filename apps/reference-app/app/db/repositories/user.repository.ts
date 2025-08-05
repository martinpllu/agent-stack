import { eq, desc } from "drizzle-orm";
import { db } from "../client";
import { users, type User, type NewUser } from "../schema";

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return result[0] || null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  async create(userData: { email: string; isAdmin?: boolean }): Promise<User> {
    const newUser: NewUser = {
      email: userData.email,
      isAdmin: userData.isAdmin || false,
      isValidated: false,
    };

    const result = await db
      .insert(users)
      .values(newUser)
      .returning();
    
    return result[0];
  }

  async updateLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        lastLogin: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
  }

  async validate(id: string): Promise<User | null> {
    const result = await db
      .update(users)
      .set({ 
        isValidated: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    return result[0] || null;
  }

  async findUnvalidatedUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.isValidated, false))
      .orderBy(desc(users.createdAt));
  }

  async findOrCreate(email: string): Promise<User> {
    const existingUser = await this.findByEmail(email);
    
    if (existingUser) {
      return existingUser;
    }
    
    return await this.create({ email });
  }

  async makeAdmin(id: string): Promise<User | null> {
    const result = await db
      .update(users)
      .set({ 
        isAdmin: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    return result[0] || null;
  }

  async findAll(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const result = await db
      .update(users)
      .set({ 
        ...data,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    return result[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    
    return result.length > 0;
  }
} 