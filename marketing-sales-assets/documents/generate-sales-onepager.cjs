const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, BorderStyle, Table, TableRow, TableCell, WidthType, VerticalAlign } = require('docx');
const fs = require('fs');

// Create the sales one-pager document
const doc = new Document({
    sections: [{
        properties: {
            page: {
                margin: {
                    top: 720,
                    right: 720,
                    bottom: 720,
                    left: 720,
                },
            },
        },
        children: [
            // Header with logo and tagline
            new Paragraph({
                children: [
                    new TextRun({
                        text: "🍴 EvoFitMeals",
                        bold: true,
                        size: 36,
                        color: "9333EA",
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
            }),
            new Paragraph({
                text: "AI-Powered Meal Planning for Fitness Professionals",
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                style: HeadingLevel.HEADING_2,
            }),

            // Value Proposition
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Transform Your Nutrition Coaching Business",
                        bold: true,
                        size: 32,
                        color: "9333EA",
                    }),
                ],
                spacing: { before: 200, after: 200 },
            }),
            new Paragraph({
                text: "Save 64+ hours per month with AI-powered meal plan generation. Scale your business, serve more clients, and increase revenue—all while delivering better results.",
                spacing: { after: 300 },
            }),

            // Key Statistics Table
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: "80%", bold: true, size: 32, color: "9333EA" }),
                                        ],
                                        alignment: AlignmentType.CENTER,
                                    }),
                                    new Paragraph({
                                        text: "Time Reduction",
                                        alignment: AlignmentType.CENTER,
                                    }),
                                ],
                                verticalAlign: VerticalAlign.CENTER,
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: "$46K", bold: true, size: 32, color: "9333EA" }),
                                        ],
                                        alignment: AlignmentType.CENTER,
                                    }),
                                    new Paragraph({
                                        text: "Avg. Annual Savings",
                                        alignment: AlignmentType.CENTER,
                                    }),
                                ],
                                verticalAlign: VerticalAlign.CENTER,
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: "+6", bold: true, size: 32, color: "9333EA" }),
                                        ],
                                        alignment: AlignmentType.CENTER,
                                    }),
                                    new Paragraph({
                                        text: "Additional Clients Possible",
                                        alignment: AlignmentType.CENTER,
                                    }),
                                ],
                                verticalAlign: VerticalAlign.CENTER,
                            }),
                        ],
                    }),
                ],
            }),
            new Paragraph({ text: "", spacing: { after: 300 } }),

            // Key Features
            new Paragraph({
                children: [
                    new TextRun({ text: "Key Features", bold: true, size: 28, color: "9333EA" }),
                ],
                spacing: { before: 200, after: 200 },
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "✓ ", bold: true, color: "3CDBB1" }),
                    new TextRun({ text: "AI-Powered Generation: ", bold: true }),
                    new TextRun({ text: "Create personalized meal plans in seconds, not hours" }),
                ],
                spacing: { after: 100 },
                bullet: { level: 0 },
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "✓ ", bold: true, color: "3CDBB1" }),
                    new TextRun({ text: "Precision Nutrition: ", bold: true }),
                    new TextRun({ text: "Hit macro targets perfectly with automated calculations" }),
                ],
                spacing: { after: 100 },
                bullet: { level: 0 },
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "✓ ", bold: true, color: "3CDBB1" }),
                    new TextRun({ text: "Client Mobile App: ", bold: true }),
                    new TextRun({ text: "Beautiful interface with grocery lists and progress tracking" }),
                ],
                spacing: { after: 100 },
                bullet: { level: 0 },
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "✓ ", bold: true, color: "3CDBB1" }),
                    new TextRun({ text: "Professional Dashboards: ", bold: true }),
                    new TextRun({ text: "Manage all clients from one powerful dashboard" }),
                ],
                spacing: { after: 100 },
                bullet: { level: 0 },
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "✓ ", bold: true, color: "3CDBB1" }),
                    new TextRun({ text: "Dietary Customization: ", bold: true }),
                    new TextRun({ text: "Automatic adjustments for allergies, preferences, and restrictions" }),
                ],
                spacing: { after: 300 },
                bullet: { level: 0 },
            }),

            // Pricing Table
            new Paragraph({
                children: [
                    new TextRun({ text: "Simple, Transparent Pricing", bold: true, size: 28, color: "9333EA" }),
                ],
                spacing: { before: 200, after: 200 },
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    // Header Row
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ text: "Plan", alignment: AlignmentType.CENTER })],
                                shading: { fill: "F8F9FA" },
                            }),
                            new TableCell({
                                children: [new Paragraph({ text: "Basic", alignment: AlignmentType.CENTER })],
                                shading: { fill: "F8F9FA" },
                            }),
                            new TableCell({
                                children: [new Paragraph({ text: "Professional", alignment: AlignmentType.CENTER })],
                                shading: { fill: "F8F9FA" },
                            }),
                            new TableCell({
                                children: [new Paragraph({ text: "Enterprise", alignment: AlignmentType.CENTER })],
                                shading: { fill: "F8F9FA" },
                            }),
                        ],
                    }),
                    // Price Row
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("Price/Month")] }),
                            new TableCell({ children: [new Paragraph({ text: "$79", alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: "$149", alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: "$299", alignment: AlignmentType.CENTER })] }),
                        ],
                    }),
                    // Clients Row
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("Active Clients")] }),
                            new TableCell({ children: [new Paragraph({ text: "Up to 10", alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: "Up to 30", alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: "Unlimited", alignment: AlignmentType.CENTER })] }),
                        ],
                    }),
                    // Meal Plans Row
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("Meal Plans/Month")] }),
                            new TableCell({ children: [new Paragraph({ text: "50", alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: "200", alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: "Unlimited", alignment: AlignmentType.CENTER })] }),
                        ],
                    }),
                    // Support Row
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("Priority Support")] }),
                            new TableCell({ children: [new Paragraph({ text: "Email", alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: "Email + Chat", alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: "Dedicated Manager", alignment: AlignmentType.CENTER })] }),
                        ],
                    }),
                ],
            }),
            new Paragraph({ text: "", spacing: { after: 300 } }),

            // Testimonials
            new Paragraph({
                children: [
                    new TextRun({ text: "What Trainers Say", bold: true, size: 28, color: "9333EA" }),
                ],
                spacing: { before: 200, after: 200 },
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: '"EvoFitMeals gave me my weekends back. I used to spend 8-10 hours every Sunday creating meal plans. Now it takes me 30 minutes."',
                        italics: true
                    }),
                ],
                spacing: { after: 100 },
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "— Sarah Chen", bold: true }),
                    new TextRun({ text: ", Personal Trainer, Los Angeles" }),
                ],
                spacing: { after: 200 },
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: '"I doubled my client roster without hiring help. The AI is incredibly accurate and my clients love the variety."',
                        italics: true
                    }),
                ],
                spacing: { after: 100 },
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "— Marcus Rodriguez", bold: true }),
                    new TextRun({ text: ", Nutrition Coach, Miami" }),
                ],
                spacing: { after: 300 },
            }),

            // ROI Section
            new Paragraph({
                children: [
                    new TextRun({ text: "Calculate Your ROI", bold: true, size: 28, color: "9333EA" }),
                ],
                spacing: { before: 200, after: 200 },
            }),
            new Paragraph({
                text: "See exactly how much time and money EvoFitMeals will save your business.",
                spacing: { after: 100 },
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "👉 Visit: ", bold: true }),
                    new TextRun({ text: "evofitmeals.com/calculator", color: "9333EA", underline: {} }),
                ],
                spacing: { after: 200 },
            }),
            new Paragraph({
                text: "[QR Code Placeholder - Insert QR code here linking to ROI calculator]",
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
                border: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                },
            }),

            // Call to Action
            new Paragraph({
                children: [
                    new TextRun({ text: "Get Started Today", bold: true, size: 32, color: "9333EA" }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 300, after: 200 },
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "✓ ", color: "3CDBB1" }),
                    new TextRun({ text: "14-day free trial" }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 50 },
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "✓ ", color: "3CDBB1" }),
                    new TextRun({ text: "No credit card required" }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 50 },
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "✓ ", color: "3CDBB1" }),
                    new TextRun({ text: "Cancel anytime" }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
            }),

            // Footer
            new Paragraph({
                children: [
                    new TextRun({ text: "Contact Us", bold: true }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 100 },
            }),
            new Paragraph({
                text: "📧 hello@evofitmeals.com | 🌐 www.evofitmeals.com | 📱 @evofitmeals",
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 },
            }),
            new Paragraph({
                text: "© 2025 EvoFitMeals. All rights reserved.",
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
            }),
        ],
    }],
});

// Generate the document
Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("sales-one-pager-v1.docx", buffer);
    console.log("✅ Sales one-pager created: sales-one-pager-v1.docx");
    console.log("📄 Next steps:");
    console.log("   1. Open the document");
    console.log("   2. Add a QR code (linking to evofitmeals.com/calculator)");
    console.log("   3. Export as PDF: sales-one-pager-v1.pdf");
    console.log("   4. Ready for distribution!");
});
