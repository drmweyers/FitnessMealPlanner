import { db } from '../db';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { emailService } from './emailService';

// Schema for communication messages
export const messageSchema = z.object({
  senderId: z.string().uuid(),
  recipientId: z.string().uuid(),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  messageType: z.enum(['message', 'notification', 'system']).default('message'),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  attachmentUrls: z.array(z.string().url()).optional(),
});

export type MessageInput = z.infer<typeof messageSchema>;

export interface TrainerCustomerMessage {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  content: string;
  messageType: 'message' | 'notification' | 'system';
  priority: 'low' | 'normal' | 'high';
  attachmentUrls?: string[];
  isRead: boolean;
  sentAt: Date;
  readAt?: Date;
  senderEmail: string;
  recipientEmail: string;
  senderRole: string;
  recipientRole: string;
}

export interface ConversationThread {
  participantId: string;
  participantEmail: string;
  participantRole: string;
  lastMessage: TrainerCustomerMessage;
  unreadCount: number;
  totalMessages: number;
}

export class TrainerCustomerCommunicationService {
  /**
   * Send a message between trainer and customer
   */
  async sendMessage(messageData: MessageInput): Promise<TrainerCustomerMessage> {
    try {
      // Verify sender and recipient exist and have valid relationship
      const relationship = await this.verifyTrainerCustomerRelationship(
        messageData.senderId,
        messageData.recipientId
      );
      
      if (!relationship.valid) {
        throw new Error(relationship.reason || 'Invalid trainer-customer relationship');
      }

      // Create message record (using a hypothetical messages table)
      // Note: This would require a database migration to create the messages table
      const messageId = this.generateMessageId();
      const sentAt = new Date();

      const message: TrainerCustomerMessage = {
        id: messageId,
        senderId: messageData.senderId,
        recipientId: messageData.recipientId,
        subject: messageData.subject,
        content: messageData.content,
        messageType: messageData.messageType,
        priority: messageData.priority,
        attachmentUrls: messageData.attachmentUrls,
        isRead: false,
        sentAt,
        senderEmail: relationship.senderEmail!,
        recipientEmail: relationship.recipientEmail!,
        senderRole: relationship.senderRole!,
        recipientRole: relationship.recipientRole!,
      };

      // Store in database (would need proper table schema)
      await this.storeMessage(message);

      // Send email notification if recipient preferences allow
      await this.sendEmailNotification(message);

      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Get conversation thread between trainer and customer
   */
  async getConversationThread(
    participantId1: string,
    participantId2: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TrainerCustomerMessage[]> {
    try {
      // Verify relationship
      const relationship = await this.verifyTrainerCustomerRelationship(participantId1, participantId2);
      if (!relationship.valid) {
        throw new Error('No valid relationship between participants');
      }

      // Get messages between participants (would use proper database query)
      const messages = await this.fetchMessages(participantId1, participantId2, limit, offset);
      return messages;
    } catch (error) {
      console.error('Failed to get conversation thread:', error);
      throw error;
    }
  }

  /**
   * Get all conversation threads for a user
   */
  async getConversationThreads(userId: string): Promise<ConversationThread[]> {
    try {
      // Get all users this person has conversations with
      const conversations = await this.fetchConversationSummaries(userId);
      return conversations;
    } catch (error) {
      console.error('Failed to get conversation threads:', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    try {
      await this.updateMessageReadStatus(messageId, userId, true);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      throw error;
    }
  }

  /**
   * Mark all messages in thread as read
   */
  async markThreadAsRead(userId: string, otherUserId: string): Promise<void> {
    try {
      await this.updateThreadReadStatus(userId, otherUserId);
    } catch (error) {
      console.error('Failed to mark thread as read:', error);
      throw error;
    }
  }

  /**
   * Get unread message count for user
   */
  async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      return await this.countUnreadMessages(userId);
    } catch (error) {
      console.error('Failed to get unread message count:', error);
      return 0;
    }
  }

  /**
   * Send system notification (e.g., meal plan assigned)
   */
  async sendSystemNotification(
    trainerId: string,
    customerId: string,
    subject: string,
    content: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<void> {
    try {
      await this.sendMessage({
        senderId: trainerId,
        recipientId: customerId,
        subject,
        content,
        messageType: 'system',
        priority,
      });
    } catch (error) {
      console.error('Failed to send system notification:', error);
    }
  }

  /**
   * Verify trainer-customer relationship exists
   */
  private async verifyTrainerCustomerRelationship(
    userId1: string,
    userId2: string
  ): Promise<{
    valid: boolean;
    reason?: string;
    senderEmail?: string;
    recipientEmail?: string;
    senderRole?: string;
    recipientRole?: string;
  }> {
    try {
      // Import at function level to avoid circular dependencies
      const { users, personalizedMealPlans, personalizedRecipes } = await import('@shared/schema');

      // Get user information
      const [user1, user2] = await Promise.all([
        db.select().from(users).where(eq(users.id, userId1)).limit(1),
        db.select().from(users).where(eq(users.id, userId2)).limit(1),
      ]);

      if (!user1.length || !user2.length) {
        return { valid: false, reason: 'One or both users not found' };
      }

      const u1 = user1[0];
      const u2 = user2[0];

      // Determine trainer and customer
      let trainerId: string, customerId: string;
      let trainerEmail: string, customerEmail: string;

      if (u1.role === 'trainer' && u2.role === 'customer') {
        trainerId = u1.id;
        customerId = u2.id;
        trainerEmail = u1.email;
        customerEmail = u2.email;
      } else if (u1.role === 'customer' && u2.role === 'trainer') {
        trainerId = u2.id;
        customerId = u1.id;
        trainerEmail = u2.email;
        customerEmail = u1.email;
      } else {
        return { valid: false, reason: 'Both users must be trainer and customer' };
      }

      // Check if there's an active relationship (meal plans or recipes assigned)
      const [mealPlanRelations, recipeRelations] = await Promise.all([
        db.select()
          .from(personalizedMealPlans)
          .where(
            and(
              eq(personalizedMealPlans.trainerId, trainerId),
              eq(personalizedMealPlans.customerId, customerId)
            )
          )
          .limit(1),
        db.select()
          .from(personalizedRecipes)
          .where(
            and(
              eq(personalizedRecipes.trainerId, trainerId),
              eq(personalizedRecipes.customerId, customerId)
            )
          )
          .limit(1),
      ]);

      const hasRelationship = mealPlanRelations.length > 0 || recipeRelations.length > 0;

      if (!hasRelationship) {
        return { valid: false, reason: 'No active trainer-customer relationship found' };
      }

      return {
        valid: true,
        senderEmail: u1.email,
        recipientEmail: u2.email,
        senderRole: u1.role,
        recipientRole: u2.role,
      };
    } catch (error) {
      console.error('Failed to verify relationship:', error);
      return { valid: false, reason: 'Database error' };
    }
  }

  /**
   * Store message in database
   */
  private async storeMessage(message: TrainerCustomerMessage): Promise<void> {
    // This would store the message in a proper messages table
    // For now, we'll use a mock implementation
    console.log('Storing message:', {
      id: message.id,
      from: message.senderEmail,
      to: message.recipientEmail,
      subject: message.subject,
    });

    // In a real implementation, this would be:
    // await db.insert(messages).values(message);
  }

  /**
   * Fetch messages between participants
   */
  private async fetchMessages(
    userId1: string,
    userId2: string,
    limit: number,
    offset: number
  ): Promise<TrainerCustomerMessage[]> {
    // Mock implementation - would query actual messages table
    return [];
  }

  /**
   * Fetch conversation summaries
   */
  private async fetchConversationSummaries(userId: string): Promise<ConversationThread[]> {
    // Mock implementation - would query actual messages table with aggregations
    return [];
  }

  /**
   * Update message read status
   */
  private async updateMessageReadStatus(
    messageId: string,
    userId: string,
    isRead: boolean
  ): Promise<void> {
    // Mock implementation
    console.log(`Marking message ${messageId} as ${isRead ? 'read' : 'unread'} for user ${userId}`);
  }

  /**
   * Update thread read status
   */
  private async updateThreadReadStatus(userId: string, otherUserId: string): Promise<void> {
    // Mock implementation
    console.log(`Marking thread between ${userId} and ${otherUserId} as read`);
  }

  /**
   * Count unread messages
   */
  private async countUnreadMessages(userId: string): Promise<number> {
    // Mock implementation
    return 0;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send email notification for new message
   */
  private async sendEmailNotification(message: TrainerCustomerMessage): Promise<void> {
    try {
      // Only send for high priority messages or if user has enabled email notifications
      if (message.priority === 'high' || message.messageType === 'system') {
        await emailService.sendMessageNotification({
          recipientEmail: message.recipientEmail,
          senderName: message.senderEmail,
          subject: message.subject,
          content: message.content.substring(0, 200) + (message.content.length > 200 ? '...' : ''),
          messageType: message.messageType,
          priority: message.priority,
        });
      }
    } catch (error) {
      console.warn('Failed to send email notification:', error);
    }
  }
}

// Singleton instance
export const trainerCustomerCommunicationService = new TrainerCustomerCommunicationService();