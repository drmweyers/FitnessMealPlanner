/**
 * ProfilePage
 *
 * Shared page object for profile management across all roles
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface ProfileData {
  name?: string;
  email?: string;
  phone?: string;
  bio?: string;
}

export class ProfilePage extends BasePage {
  // Selectors
  private readonly profileContainer = '[data-testid="profile-container"]';
  private readonly profileAvatar = '[data-testid="profile-avatar"], .profile-avatar';
  private readonly uploadPhotoButton = 'button:has-text("Upload Photo"), button:has-text("Change Photo")';
  private readonly photoInput = 'input[type="file"][accept*="image"]';
  private readonly editProfileButton = 'button:has-text("Edit Profile")';
  private readonly profileForm = '[data-testid="profile-form"]';
  private readonly nameInput = 'input[name="name"]';
  private readonly emailInput = 'input[name="email"]';
  private readonly phoneInput = 'input[name="phone"]';
  private readonly bioTextarea = 'textarea[name="bio"]';
  private readonly saveButton = 'button:has-text("Save"), button[type="submit"]';
  private readonly cancelButton = 'button:has-text("Cancel")';
  private readonly successMessage = '[data-testid="success-message"]';
  private readonly changePasswordButton = 'button:has-text("Change Password")';
  private readonly passwordModal = '[data-testid="password-modal"]';
  private readonly currentPasswordInput = 'input[name="currentPassword"]';
  private readonly newPasswordInput = 'input[name="newPassword"]';
  private readonly confirmPasswordInput = 'input[name="confirmPassword"]';
  private readonly savePasswordButton = 'button:has-text("Save Password")';

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/profile');
    await this.waitForPageLoad();
  }

  async clickEditProfile(): Promise<void> {
    await this.click(this.editProfileButton);
    await this.waitForVisible(this.profileForm);
  }

  async fillProfileForm(data: ProfileData): Promise<void> {
    if (data.name) await this.fill(this.nameInput, data.name);
    if (data.email) await this.fill(this.emailInput, data.email);
    if (data.phone) await this.fill(this.phoneInput, data.phone);
    if (data.bio) await this.fill(this.bioTextarea, data.bio);
  }

  async saveProfile(): Promise<void> {
    await this.click(this.saveButton);
    await this.waitForResponse('/api/profile');
  }

  async cancelEdit(): Promise<void> {
    await this.click(this.cancelButton);
  }

  async updateProfile(data: ProfileData): Promise<void> {
    await this.clickEditProfile();
    await this.fillProfileForm(data);
    await this.saveProfile();
  }

  async uploadProfilePhoto(filePath: string): Promise<void> {
    await this.uploadFile(this.photoInput, filePath);
    await this.waitForResponse('/api/profile/photo');
  }

  async clickChangePassword(): Promise<void> {
    await this.click(this.changePasswordButton);
    await this.waitForModal(this.passwordModal);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.clickChangePassword();
    await this.fill(this.currentPasswordInput, currentPassword);
    await this.fill(this.newPasswordInput, newPassword);
    await this.fill(this.confirmPasswordInput, newPassword);
    await this.click(this.savePasswordButton);
    await this.waitForResponse('/api/profile/password');
  }

  async getName(): Promise<string> {
    return await this.getValue(this.nameInput);
  }

  async getEmail(): Promise<string> {
    return await this.getValue(this.emailInput);
  }

  async getPhone(): Promise<string> {
    return await this.getValue(this.phoneInput);
  }

  async getBio(): Promise<string> {
    return await this.getValue(this.bioTextarea);
  }

  async assertProfileContainerVisible(): Promise<void> {
    await this.assertVisible(this.profileContainer);
  }

  async assertProfileAvatarVisible(): Promise<void> {
    await this.assertVisible(this.profileAvatar);
  }

  async assertSuccessMessageVisible(): Promise<void> {
    await this.assertVisible(this.successMessage);
  }

  async assertProfileSaved(): Promise<void> {
    await this.waitForResponse('/api/profile');
    await this.assertSuccessMessageVisible();
  }

  async assertNameEquals(expectedName: string): Promise<void> {
    const actualName = await this.getName();
    expect(actualName).toBe(expectedName);
  }
}
