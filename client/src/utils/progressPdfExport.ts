/**
 * Progress Report PDF Export Utility
 * 
 * Client-side PDF generation for customer progress reports using jsPDF.
 * Provides comprehensive progress visualization including measurements,
 * goals, milestones, and comparative analysis.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  ProgressMeasurement,
  CustomerGoal,
  GoalMilestone
} from '@shared/schema';

export interface ProgressReportData {
  customerName: string;
  reportPeriod: {
    start: Date;
    end: Date;
  };
  measurements: Array<{
    date: Date;
    weight?: number;
    bodyFat?: number;
    muscleMass?: number;
    waist?: number;
    chest?: number;
    arms?: number;
    thighs?: number;
  }>;
  goals: Array<{
    name: string;
    target: number;
    current: number;
    unit: string;
    status: 'pending' | 'in-progress' | 'achieved';
    deadline?: Date;
  }>;
  milestones: Array<{
    name: string;
    description: string;
    achievedAt: Date;
    points: number;
  }>;
  photos?: Array<{
    url: string;
    date: Date;
    angle: 'front' | 'side' | 'back';
  }>;
  summary: {
    totalWeightChange: number;
    totalBodyFatChange: number;
    goalsAchieved: number;
    totalGoals: number;
    milestonesEarned: number;
    consistencyScore: number;
  };
}

export interface ProgressPdfOptions {
  includePhotos?: boolean;
  includeCharts?: boolean;
  includeMeasurementTable?: boolean;
  includeGoalProgress?: boolean;
  includeMilestones?: boolean;
  includeComparison?: boolean;
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

/**
 * Generate progress report PDF
 */
export async function exportProgressReportToPDF(
  reportData: ProgressReportData,
  options: ProgressPdfOptions = {}
): Promise<void> {
  const {
    includePhotos = false,
    includeCharts = true,
    includeMeasurementTable = true,
    includeGoalProgress = true,
    includeMilestones = true,
    includeComparison = true,
    pageSize = 'a4',
    orientation = 'portrait'
  } = options;

  // Create PDF document
  const pdf = new jsPDF(orientation, 'mm', pageSize);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  let currentY = margin;

  // Title Section
  pdf.setFillColor(39, 174, 96); // Green color
  pdf.rect(0, 0, pageWidth, 50, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Progress Report', pageWidth / 2, 20, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(reportData.customerName, pageWidth / 2, 32, { align: 'center' });
  
  pdf.setFontSize(10);
  const periodText = `${formatDate(reportData.reportPeriod.start)} - ${formatDate(reportData.reportPeriod.end)}`;
  pdf.text(periodText, pageWidth / 2, 42, { align: 'center' });

  currentY = 60;

  // Summary Section
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Progress Summary', margin, currentY);
  currentY += 10;

  // Summary cards
  drawSummaryCards(pdf, reportData.summary, margin, currentY, contentWidth);
  currentY += 40;

  // Goals Progress Section
  if (includeGoalProgress && reportData.goals.length > 0) {
    if (currentY > pageHeight - 80) {
      pdf.addPage();
      currentY = margin;
    }

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Fitness Goals', margin, currentY);
    currentY += 10;

    currentY = drawGoalsSection(pdf, reportData.goals, margin, currentY, contentWidth);
    currentY += 15;
  }

  // Measurements Table
  if (includeMeasurementTable && reportData.measurements.length > 0) {
    if (currentY > pageHeight - 60) {
      pdf.addPage();
      currentY = margin;
    }

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Body Measurements', margin, currentY);
    currentY += 10;

    currentY = drawMeasurementsTable(pdf, reportData.measurements, margin, currentY);
    currentY += 15;
  }

  // Milestones Section
  if (includeMilestones && reportData.milestones.length > 0) {
    if (currentY > pageHeight - 60) {
      pdf.addPage();
      currentY = margin;
    }

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Achievements & Milestones', margin, currentY);
    currentY += 10;

    currentY = drawMilestonesSection(pdf, reportData.milestones, margin, currentY, contentWidth);
    currentY += 15;
  }

  // Comparison Section
  if (includeComparison && reportData.measurements.length >= 2) {
    if (currentY > pageHeight - 80) {
      pdf.addPage();
      currentY = margin;
    }

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Before & After Comparison', margin, currentY);
    currentY += 10;

    currentY = drawComparisonSection(pdf, reportData.measurements, margin, currentY, contentWidth);
  }

  // Charts Section
  if (includeCharts && reportData.measurements.length > 1) {
    pdf.addPage();
    currentY = margin;

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Progress Trends', margin, currentY);
    currentY += 10;

    currentY = drawProgressCharts(pdf, reportData.measurements, margin, currentY, contentWidth);
  }

  // Footer
  addFooter(pdf);

  // Generate filename and save
  const fileName = generateFileName(reportData.customerName, 'progress-report');
  pdf.save(fileName);
}

/**
 * Draw summary cards
 */
function drawSummaryCards(
  pdf: jsPDF,
  summary: ProgressReportData['summary'],
  x: number,
  y: number,
  width: number
): void {
  const cardWidth = width / 4 - 5;
  const cardHeight = 25;

  // Weight Change Card
  drawSummaryCard(
    pdf,
    'Weight Change',
    `${summary.totalWeightChange > 0 ? '+' : ''}${summary.totalWeightChange.toFixed(1)} kg`,
    x,
    y,
    cardWidth,
    cardHeight,
    summary.totalWeightChange < 0 ? '#27AE60' : '#EB5757'
  );

  // Body Fat Change Card
  drawSummaryCard(
    pdf,
    'Body Fat',
    `${summary.totalBodyFatChange > 0 ? '+' : ''}${summary.totalBodyFatChange.toFixed(1)}%`,
    x + cardWidth + 5,
    y,
    cardWidth,
    cardHeight,
    summary.totalBodyFatChange < 0 ? '#27AE60' : '#EB5757'
  );

  // Goals Progress Card
  drawSummaryCard(
    pdf,
    'Goals',
    `${summary.goalsAchieved}/${summary.totalGoals}`,
    x + (cardWidth + 5) * 2,
    y,
    cardWidth,
    cardHeight,
    '#2D9CDB'
  );

  // Milestones Card
  drawSummaryCard(
    pdf,
    'Milestones',
    `${summary.milestonesEarned}`,
    x + (cardWidth + 5) * 3,
    y,
    cardWidth,
    cardHeight,
    '#F2994A'
  );
}

/**
 * Draw individual summary card
 */
function drawSummaryCard(
  pdf: jsPDF,
  title: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
): void {
  // Card background
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(x, y, width, height, 3, 3, 'F');

  // Title
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(title, x + width / 2, y + 8, { align: 'center' });

  // Value
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const rgb = hexToRgb(color);
  pdf.setTextColor(rgb.r, rgb.g, rgb.b);
  pdf.text(value, x + width / 2, y + 18, { align: 'center' });
}

/**
 * Draw goals section
 */
function drawGoalsSection(
  pdf: jsPDF,
  goals: ProgressReportData['goals'],
  x: number,
  y: number,
  width: number
): number {
  let currentY = y;

  for (const goal of goals) {
    if (currentY > pdf.internal.pageSize.getHeight() - 30) {
      pdf.addPage();
      currentY = 20;
    }

    // Goal name
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(50, 50, 50);
    pdf.text(goal.name, x, currentY);

    // Progress bar
    const barY = currentY + 2;
    const barWidth = width - 60;
    const barHeight = 6;
    const progress = Math.min((goal.current / goal.target) * 100, 100);

    // Background
    pdf.setFillColor(230, 230, 230);
    pdf.rect(x, barY, barWidth, barHeight, 'F');

    // Progress
    const progressColor = goal.status === 'achieved' ? '#27AE60' : '#2D9CDB';
    const rgb = hexToRgb(progressColor);
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
    pdf.rect(x, barY, (barWidth * progress) / 100, barHeight, 'F');

    // Progress text
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    const progressText = `${goal.current} / ${goal.target} ${goal.unit} (${progress.toFixed(0)}%)`;
    pdf.text(progressText, x + barWidth + 5, currentY);

    currentY += 15;
  }

  return currentY;
}

/**
 * Draw measurements table
 */
function drawMeasurementsTable(
  pdf: jsPDF,
  measurements: ProgressReportData['measurements'],
  x: number,
  y: number
): number {
  // Prepare table data
  const headers = ['Date', 'Weight (kg)', 'Body Fat (%)', 'Muscle (kg)', 'Waist (cm)'];
  const rows = measurements.slice(-10).map(m => [
    formatDate(m.date),
    m.weight?.toFixed(1) || '-',
    m.bodyFat?.toFixed(1) || '-',
    m.muscleMass?.toFixed(1) || '-',
    m.waist?.toFixed(1) || '-'
  ]);

  // Draw table using autoTable
  (pdf as any).autoTable({
    head: [headers],
    body: rows,
    startY: y,
    margin: { left: x },
    theme: 'striped',
    headStyles: {
      fillColor: [39, 174, 96],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  return (pdf as any).lastAutoTable.finalY + 5;
}

/**
 * Draw milestones section
 */
function drawMilestonesSection(
  pdf: jsPDF,
  milestones: ProgressReportData['milestones'],
  x: number,
  y: number,
  width: number
): number {
  let currentY = y;

  for (const milestone of milestones) {
    if (currentY > pdf.internal.pageSize.getHeight() - 25) {
      pdf.addPage();
      currentY = 20;
    }

    // Milestone box
    pdf.setFillColor(255, 243, 205);
    pdf.setDrawColor(255, 193, 7);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x, currentY, width, 20, 2, 2, 'FD');

    // Trophy icon
    pdf.setFontSize(14);
    pdf.text('🏆', x + 5, currentY + 12);

    // Milestone name
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(50, 50, 50);
    pdf.text(milestone.name, x + 20, currentY + 8);

    // Achievement date
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Achieved: ${formatDate(milestone.achievedAt)}`, x + 20, currentY + 15);

    // Points
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 152, 0);
    pdf.text(`+${milestone.points} pts`, x + width - 25, currentY + 12);

    currentY += 25;
  }

  return currentY;
}

/**
 * Draw comparison section
 */
function drawComparisonSection(
  pdf: jsPDF,
  measurements: ProgressReportData['measurements'],
  x: number,
  y: number,
  width: number
): number {
  const first = measurements[0];
  const last = measurements[measurements.length - 1];

  const compareWidth = width / 2 - 10;

  // Before section
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(x, y, compareWidth, 60, 3, 3, 'F');

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(50, 50, 50);
  pdf.text('Starting Point', x + compareWidth / 2, y + 10, { align: 'center' });

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(formatDate(first.date), x + compareWidth / 2, y + 18, { align: 'center' });

  // Starting measurements
  let measureY = y + 25;
  const startMeasurements = [
    `Weight: ${first.weight?.toFixed(1) || '-'} kg`,
    `Body Fat: ${first.bodyFat?.toFixed(1) || '-'}%`,
    `Muscle: ${first.muscleMass?.toFixed(1) || '-'} kg`,
    `Waist: ${first.waist?.toFixed(1) || '-'} cm`
  ];

  pdf.setFontSize(9);
  for (const measure of startMeasurements) {
    pdf.text(measure, x + 10, measureY);
    measureY += 7;
  }

  // Current section
  pdf.setFillColor(230, 255, 230);
  pdf.roundedRect(x + compareWidth + 20, y, compareWidth, 60, 3, 3, 'F');

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(39, 174, 96);
  pdf.text('Current', x + compareWidth + 20 + compareWidth / 2, y + 10, { align: 'center' });

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(formatDate(last.date), x + compareWidth + 20 + compareWidth / 2, y + 18, { align: 'center' });

  // Current measurements with changes
  measureY = y + 25;
  const currentMeasurements = [
    {
      label: 'Weight',
      value: last.weight,
      change: last.weight && first.weight ? last.weight - first.weight : null,
      unit: 'kg'
    },
    {
      label: 'Body Fat',
      value: last.bodyFat,
      change: last.bodyFat && first.bodyFat ? last.bodyFat - first.bodyFat : null,
      unit: '%'
    },
    {
      label: 'Muscle',
      value: last.muscleMass,
      change: last.muscleMass && first.muscleMass ? last.muscleMass - first.muscleMass : null,
      unit: 'kg'
    },
    {
      label: 'Waist',
      value: last.waist,
      change: last.waist && first.waist ? last.waist - first.waist : null,
      unit: 'cm'
    }
  ];

  pdf.setFontSize(9);
  for (const measure of currentMeasurements) {
    const text = `${measure.label}: ${measure.value?.toFixed(1) || '-'} ${measure.unit}`;
    if (measure.change !== null) {
      const changeText = measure.change > 0 ? `+${measure.change.toFixed(1)}` : measure.change.toFixed(1);
      const changeColor = measure.label === 'Muscle' 
        ? (measure.change > 0 ? '#27AE60' : '#EB5757')
        : (measure.change < 0 ? '#27AE60' : '#EB5757');
      
      pdf.setTextColor(100, 100, 100);
      pdf.text(text, x + compareWidth + 30, measureY);
      
      const rgb = hexToRgb(changeColor);
      pdf.setTextColor(rgb.r, rgb.g, rgb.b);
      pdf.setFontSize(8);
      pdf.text(`(${changeText})`, x + compareWidth + 80, measureY);
      pdf.setFontSize(9);
    } else {
      pdf.setTextColor(100, 100, 100);
      pdf.text(text, x + compareWidth + 30, measureY);
    }
    measureY += 7;
  }

  return y + 70;
}

/**
 * Draw progress charts (simplified representation)
 */
function drawProgressCharts(
  pdf: jsPDF,
  measurements: ProgressReportData['measurements'],
  x: number,
  y: number,
  width: number
): number {
  // Weight trend chart
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(50, 50, 50);
  pdf.text('Weight Trend', x, y);

  // Draw simple line chart representation
  const chartHeight = 40;
  const chartY = y + 5;

  // Chart background
  pdf.setFillColor(248, 250, 252);
  pdf.rect(x, chartY, width, chartHeight, 'F');

  // Draw grid lines
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.1);
  for (let i = 0; i <= 4; i++) {
    const lineY = chartY + (chartHeight / 4) * i;
    pdf.line(x, lineY, x + width, lineY);
  }

  // Draw weight trend line (simplified)
  if (measurements.length > 1) {
    const weights = measurements.map(m => m.weight).filter(w => w !== undefined) as number[];
    if (weights.length > 1) {
      const maxWeight = Math.max(...weights);
      const minWeight = Math.min(...weights);
      const range = maxWeight - minWeight || 1;

      pdf.setDrawColor(39, 174, 96);
      pdf.setLineWidth(1);

      for (let i = 1; i < weights.length; i++) {
        const x1 = x + (width / (weights.length - 1)) * (i - 1);
        const x2 = x + (width / (weights.length - 1)) * i;
        const y1 = chartY + chartHeight - ((weights[i - 1] - minWeight) / range) * chartHeight;
        const y2 = chartY + chartHeight - ((weights[i] - minWeight) / range) * chartHeight;
        pdf.line(x1, y1, x2, y2);
      }
    }
  }

  return chartY + chartHeight + 20;
}

/**
 * Add footer to all pages
 */
function addFooter(pdf: jsPDF): void {
  const pageCount = pdf.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    pdf.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    
    pdf.text(
      `Generated on ${formatDate(new Date())}`,
      pageWidth - 20,
      pageHeight - 10,
      { align: 'right' }
    );
    
    pdf.text(
      'EvoFit Meals',
      20,
      pageHeight - 10
    );
  }
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Generate safe filename
 */
function generateFileName(customerName: string, type: string): string {
  const safeName = customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${type}_${safeName}_${timestamp}.pdf`;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Export multiple progress reports to combined PDF
 */
export async function exportMultipleProgressReportsToPDF(
  reports: ProgressReportData[],
  options: ProgressPdfOptions = {}
): Promise<void> {
  // This would combine multiple reports into a single PDF
  // For now, we'll generate them separately
  for (const report of reports) {
    await exportProgressReportToPDF(report, options);
  }
}