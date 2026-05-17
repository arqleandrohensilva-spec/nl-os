import React from 'react';
import Sidebar from '@/components/Sidebar';

const Dashboard = () => {
  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar user="Sócio" />
      <main className="flex-1 ml-[230px] p-20">
        <h1 className="text-white text-3xl">Dashboard Central</h1>
      </main>
    </div>
  );
};

export default Dashboard;
