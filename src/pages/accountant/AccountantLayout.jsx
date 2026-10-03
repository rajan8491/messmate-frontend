// layouts/accountant/AccountantLayout.jsx
import { useContext, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../../components/accountant/Navbar";
import Footer from "../../components/common/Footer";
import AccountantContext from "../../context/AccountantContext";
import Loader from "../../components/common/Loader";

function AccountantLayout() {

  const {accountantProfile, loadingProfile, fetchAccountantProfile} = useContext(AccountantContext);

  useEffect(() => {
    if (!accountantProfile) {
      fetchAccountantProfile();
    }
  }, [accountantProfile, fetchAccountantProfile]);


  if (loadingProfile) {
    return <Loader text="Loading Accountant Profile..." loaderNumber={1} />;
  }

  if (!accountantProfile) {
    return <div>Unable to load accountant profile.</div>;
  }

  return (
    <>
      <Navbar accountantProfile={accountantProfile} />

      <main className="pt-14 min-h-screen">
        <Outlet context={{ accountantProfile }} />
      </main>

      <Footer />
    </>
  );
}

export default AccountantLayout;