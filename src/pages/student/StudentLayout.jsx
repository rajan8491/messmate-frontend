import { useContext, useEffect } from "react";
import StudentContext from "../../context/StudentContext";
import Footer from "../../components/common/Footer";
import Loader from "../../components/common/Loader";
import StudentNavbar from "../../components/student/Navbar";
import { Outlet } from "react-router-dom";

export default function StudentLayout() {
  const { studentProfile, loadingProfile, fetchStudentProfile } = useContext(StudentContext);

  useEffect(() => {
    if (!studentProfile) {
      fetchStudentProfile();
    }
  }, [studentProfile, fetchStudentProfile]);

  if(loadingProfile) {
    return <Loader text="Loading Student Profile..." loaderNumber={1} />;
  }

  if(!studentProfile) {
    return <div>Unable to load student profile.</div>;
  }

  return (
    <>
      <StudentNavbar studentProfile={studentProfile} />
      <main className="pt-14 min-h-screen">
        <Outlet context={{ studentProfile }} />
      </main>
      <Footer />
    </>
  );
}
 