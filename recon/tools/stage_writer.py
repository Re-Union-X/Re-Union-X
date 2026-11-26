"""MAP part writer shared by the generated stages (gen_story_maps.py mr_body, gen_colosseum_stages.py).

    map_part(head, room, exits, areas, ens, chests, npcs=(), mats=()) -> bytes

head: the first 0x34 bytes of a real MAP part (magic, version, field8, weather are kept), room: the room name written at
0x0c, exits: (9 int) records, areas: 0x44-byte team records (first / count / uid already set), ens: (x, y, enemyId, f3, f4,
level, reward, uid) records, chests: (x, y, reward, kind, uid), npcs: (x, y, id) map objects of type 4, mats: (x, y,
materialId, quantity). Section layout as in mapfile.py; with no npcs the old empty block of 64 zero bytes.
"""
import struct


def materials_block(mats):
    return struct.pack('<i', len(mats)) + b''.join(struct.pack('<4i', *m) for m in mats)


def map_part(head, room, exits, areas, ens, chests, npcs=(), mats=()):
    """MAP part with an exits block (several parts): header of the template, exits, areas, enemies, chests, objects (npcs:
    (x, y, id) map objects of type 4, the portals of PORTAL_ROOMS; without them the old empty block, byte for byte)."""
    body = bytearray(head[:0x34])
    nm = room.encode()
    body[0x0c:0x0c + 16] = nm + b'\0' * (16 - len(nm))
    body += struct.pack('<i', len(exits))
    for e in exits:
        body += struct.pack('<9i', *e)
    X = len(body) - 0x34                                            # = 4 + 36 n
    body += struct.pack('<2i', len(areas), len(ens))
    struct.pack_into('<2i', body, 0x20, 0, X)
    for a in areas:
        body += a
    for e in ens:
        body += struct.pack('<8i', *e)
    A = len(body)
    body += struct.pack('<i', len(chests))
    for c in chests:
        body += struct.pack('<5i', *c)
    B = len(body)
    body += materials_block(mats)
    C = len(body)
    if npcs:
        # as the originals: count, 0x20 per object (x, y, id, short type 4, 0, facing 1, 0, talk 0, talk2 0, 0), no padding
        body += struct.pack('<i', len(npcs))
        for x, y, i in npcs:
            body += struct.pack('<3i4h3i', x, y, i, 4, 0, 1, 0, 0, 0, 0)
    else:
        body += b'\0' * 64
    struct.pack_into('<3i', body, 0x28, A - 0x34, B - 0x34, C - 0x34)
    return bytes(body)
