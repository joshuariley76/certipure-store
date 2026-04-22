export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b py-16 px-4 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Contact Us</h1>
        <p className="text-gray-500 text-sm">Have a question? Our team typically responds within 24 hours.</p>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">First Name</label>
                <input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2d3ca5]" placeholder="John" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Last Name</label>
                <input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2d3ca5]" placeholder="Doe" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2d3ca5]" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Message</label>
              <textarea rows={5} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2d3ca5] resize-none" placeholder="How can we help?" />
            </div>
            <button className="w-full bg-[#2d3ca5] text-white font-bold text-sm py-3.5 rounded-xl hover:bg-[#232f82] transition">Send Message</button>
          </div>
        </div>
      </div>
    </main>
  )
}