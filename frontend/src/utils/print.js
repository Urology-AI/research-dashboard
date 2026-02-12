/**
 * Print utilities for patient summaries and reports
 */

export const printPatientSummary = (patient, procedures, labResults, followUps) => {
  const printWindow = window.open('', '_blank');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Patient Summary - ${patient.mrn}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          color: #1976d2;
          border-bottom: 2px solid #1976d2;
          padding-bottom: 10px;
        }
        h2 {
          color: #666;
          margin-top: 30px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        .section {
          margin: 20px 0;
        }
        .info-row {
          display: flex;
          margin: 8px 0;
        }
        .info-label {
          font-weight: bold;
          width: 150px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <h1>Patient Summary</h1>
      
      <div class="section">
        <h2>Patient Information</h2>
        <div class="info-row">
          <span class="info-label">MRN:</span>
          <span>${patient.mrn}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span>${patient.first_name || ''} ${patient.last_name || ''}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date of Birth:</span>
          <span>${patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Age:</span>
          <span>${patient.age || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Gender:</span>
          <span>${patient.gender || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Diagnosis:</span>
          <span>${patient.diagnosis || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Gleason Score:</span>
          <span>${patient.gleason_score || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">PSA Level:</span>
          <span>${patient.psa_level ? `${patient.psa_level} ng/mL` : 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Clinical Stage:</span>
          <span>${patient.clinical_stage || 'N/A'}</span>
        </div>
      </div>

      ${procedures.length > 0 ? `
        <div class="section">
          <h2>Procedures (${procedures.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Provider</th>
                <th>Gleason Score</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${procedures.map(p => `
                <tr>
                  <td>${new Date(p.procedure_date).toLocaleDateString()}</td>
                  <td>${p.procedure_type || 'N/A'}</td>
                  <td>${p.provider || 'N/A'}</td>
                  <td>${p.gleason_score || 'N/A'}</td>
                  <td>${p.notes || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${labResults.length > 0 ? `
        <div class="section">
          <h2>Lab Results (${labResults.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Test Type</th>
                <th>Value</th>
                <th>Unit</th>
                <th>Reference Range</th>
              </tr>
            </thead>
            <tbody>
              ${labResults.map(l => `
                <tr>
                  <td>${new Date(l.test_date).toLocaleDateString()}</td>
                  <td>${l.test_type}</td>
                  <td>${l.test_value || 'N/A'}</td>
                  <td>${l.test_unit || 'N/A'}</td>
                  <td>${l.reference_range || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${followUps.length > 0 ? `
        <div class="section">
          <h2>Follow-ups (${followUps.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Provider</th>
                <th>Next Follow-up</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${followUps.map(fu => `
                <tr>
                  <td>${new Date(fu.follow_up_date).toLocaleDateString()}</td>
                  <td>${fu.follow_up_type || 'N/A'}</td>
                  <td>${fu.provider || 'N/A'}</td>
                  <td>${fu.next_follow_up_date ? new Date(fu.next_follow_up_date).toLocaleDateString() : 'N/A'}</td>
                  <td>${fu.notes || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="footer">
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>Research Dashboard</p>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
  }, 250);
};
