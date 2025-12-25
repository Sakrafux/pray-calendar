/**
 * To download a file in the frontend programmatically, an anchor tag must be injected and used.
 * For security reasons, it is often more practical to fetch the data from the backend securely and
 * then simply create the download on the frontend, as opposed to a direct backend link.
 */
export const downloadAsFile = (data: string, filename: string) => {
    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};
