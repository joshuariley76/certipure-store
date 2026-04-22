export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b py-16 px-4 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Contact Us</h1>
        <p className="text-gray-500 text-sm">Have a question? We are here to help. Our team typically responds within 24 hours.</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">First Name</label>
                <input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2d3ca5] transition" placeholder="John" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Last Name</label>
                <input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2d3ca5] transition" placeholder="Doe" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2d3ca5] transition" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Subject</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2d3ca5] transition text-gray-500">
                <option>General Inquiry</option>
                <option>Order Support</option>
                <option>Product Question</option>
                <option>Wholesale / Bulk Pricing</option>
                <option>Lab Results / COAs</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Message</label>
              <textarea rows={5} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2d3ca5] transition resize-none" placeholder="How can we help?" />
            </div>
            <button className="w-full bg-[#2d3ca5] text-white font-bold text-sm py-3.5 rounded-xl hover:bg-[#232f82] transition">
              Send Message
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
            <div className="w-10 h-10 mx-auto bg-blue-50 rounded-xl flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[#2d3ca5]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <h3 className="font-bold text-sm mb-1">Email</h3>
            <p className="text-sm text-[#2d3ca5]">support@certipure.com</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
            <div className="w-10 h-10 mx-auto bg-blue-50 rounded-xl flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[#2d3ca5]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <h3 className="font-bold text-sm mb-1">Response Time</h3>
            <p className="text-sm text-gray-500">Within 24 hours</p>
          </div>
        </div>
      </div>
    </main>
  )
}
