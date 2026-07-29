import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const EXCEL_FILE_PATH = path.join(process.cwd(), 'Appointments.xlsx');

export function saveAppointmentToExcel(appointmentData: any) {
  try {
    let workbook: XLSX.WorkBook;
    let worksheet: XLSX.WorkSheet;
    
    // Check if the file already exists
    if (fs.existsSync(EXCEL_FILE_PATH)) {
      workbook = XLSX.readFile(EXCEL_FILE_PATH);
      worksheet = workbook.Sheets['Bookings'];
    } else {
      // Create new workbook if it doesn't exist
      workbook = XLSX.utils.book_new();
      worksheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');
    }

    // Convert existing sheet to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Add new appointment
    data.push({
      Date: new Date().toLocaleDateString(),
      Time: appointmentData.time,
      Merchant_Name: appointmentData.customer,
      Merchant_ID: appointmentData.merchantId || '',
      Phone_Number: appointmentData.phone,
      Issue_Description: appointmentData.service,
      Status: appointmentData.status
    });

    // Write back to sheet
    const newWorksheet = XLSX.utils.json_to_sheet(data);
    workbook.Sheets['Bookings'] = newWorksheet;
    
    XLSX.writeFile(workbook, EXCEL_FILE_PATH);
    console.log('Successfully saved to Appointments.xlsx');
  } catch (error) {
    console.error('Failed to save to Excel:', error);
  }
}
