import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-jwt'
import { UserService } from '../user/user.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private userService: UserService) {
    super({
      jwtFromRequest: (req: { headers: { authorization: string } }) => req.headers.authorization?.split(' ')[1],
      secretOrKey: process.env.JWT_SECRET,
    })
  }

  async validate(payload: any) {
    const user = await this.userService.getUserById(payload.sub)
    if (!user) {
      throw new UnauthorizedException('Token không hợp lệ')
    }
    return user
  }
}
