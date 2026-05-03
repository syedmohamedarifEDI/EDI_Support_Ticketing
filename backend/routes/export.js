const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const Ticket = require('../models/Ticket');
const Project = require('../models/Project');
const { requireAuth } = require('../middleware/auth');

router.get('/tickets/:projectId', requireAuth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tickets = await Ticket.find({ projectId: req.params.projectId })
      .populate('assignedTo', 'name')
      .sort({ serialNumber: 1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tickets');

    // Define columns
    sheet.columns = [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Incident Start Time', key: 'incidentStartTime', width: 22 },
      { header: 'Incident End Time', key: 'incidentEndTime', width: 22 },
      { header: 'Issue', key: 'issue', width: 40 },
      { header: 'Assigned To', key: 'assignedTo', width: 20 },
      { header: 'Systems Impacted', key: 'systemsImpacted', width: 30 },
      { header: 'Business Criticality', key: 'businessCriticality', width: 20 },
      { header: 'RCA', key: 'rca', width: 40 },
      { header: 'Interface Name', key: 'interfaceName', width: 25 },
      { header: 'Execution ID', key: 'executionId', width: 20 },
      { header: 'Fixes Details', key: 'fixesDetails', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    headerRow.height = 30;

    // Add data rows
    tickets.forEach((ticket, index) => {
      const row = sheet.addRow({
        sno: ticket.serialNumber,
        incidentStartTime: ticket.incidentStartTime || '',
        incidentEndTime: ticket.incidentEndTime || '',
        issue: ticket.issue || '',
        assignedTo: ticket.assignedTo ? ticket.assignedTo.name : '',
        systemsImpacted: ticket.systemsImpacted || '',
        businessCriticality: ticket.businessCriticality || '',
        rca: ticket.rca || '',
        interfaceName: ticket.interfaceName || '',
        executionId: ticket.executionId || '',
        fixesDetails: ticket.fixesDetails || '',
        status: ticket.status || '',
      });

      // Alternate row colors
      const bgColor = index % 2 === 0 ? 'FFFAFAFA' : 'FFE8F0FE';
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
      });

      // Color criticality cell
      const critCell = row.getCell('businessCriticality');
      if (ticket.businessCriticality === 'P1') {
        critCell.font = { bold: true, color: { argb: 'FFCC0000' } };
      } else if (ticket.businessCriticality === 'P2') {
        critCell.font = { bold: true, color: { argb: 'FFFF6600' } };
      }
    });

    // Freeze header
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const filename = `${project.projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Tickets.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
