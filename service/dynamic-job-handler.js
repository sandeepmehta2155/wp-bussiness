const myDynamicJobHandler = async (job) => {
  const { subdomain } = job.data;

  await sendEmailToCustomers(subdomain);
  console.log("Email sent to customers");
};

const sendEmailToCustomers = async (subdomain) => {
  console.log("Sending email to customers" + subdomain);
};

module.exports = {
  myDynamicJobHandler,
};
  