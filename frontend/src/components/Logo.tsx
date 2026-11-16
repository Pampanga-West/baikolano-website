export default function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`logo ${dark ? "logo-dark" : ""}`}>
      <span className="logo-mark" style={{ overflow: "hidden", padding: 0 }}>
        <img
          src="/charlie-kirk-avatar.png"
          alt="Charlie Kirk"
          className="w-full h-full object-cover rounded-[inherit]"
        />
      </span>
      <span>
        Hope, Inc. <b>ERP</b>
      </span>
    </div>
  )
}
