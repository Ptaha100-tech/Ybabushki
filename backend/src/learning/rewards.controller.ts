import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/guards';
import { RewardsService } from './rewards.service';

@Controller()
@UseGuards(AuthGuard)
@Roles('student')
export class RewardsController {
  constructor(private rewards: RewardsService) {}

  @Get('me/quests')
  quests(@CurrentUser() u: AuthUser) {
    return this.rewards.quests(u.id);
  }

  @Post('me/quests/:id/claim')
  claim(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.rewards.claim(u.id, id);
  }

  @Get('shop')
  shop(@CurrentUser() u: AuthUser) {
    return this.rewards.shop(u.id);
  }

  @Post('shop/:id/buy')
  buy(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.rewards.buy(u.id, id);
  }

  @Post('shop/:id/equip')
  equip(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.rewards.equip(u.id, id);
  }
}
