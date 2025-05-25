import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PostgresService } from '../../database/postgres.service';
import { UsersService } from '../users/users.service'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    
  constructor(private authService: AuthService, private postgresService:PostgresService, private usersService: UsersService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALL_BACK_URL,
      scope: ['email', 'profile'],
    });
  }
  
  async validate(accessToken: string, refreshToken: string, profile: any) {
    const email:string = profile.emails[0].value;
    const name:string  = profile.displayName
    const user = await this.usersService.getUserByEmail(email);
    // Nếu không tồn tại user -> tạo mới
    if (!user) {
      const newUserResult = await this.usersService.createUser(email,name)
      return newUserResult;
    }

    return user;
  }
}
