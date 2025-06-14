import * as bcrypt from 'bcrypt';

export function hashPassword(password:string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }